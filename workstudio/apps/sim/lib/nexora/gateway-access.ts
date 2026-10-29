import { db } from '@sim/db'
import { account, nexoraGatewayKey, workspace } from '@sim/db/schema'
import { createLogger } from '@sim/logger'
import { toStringOrNull } from '@sim/utils/coerce'
import { getErrorMessage } from '@sim/utils/errors'
import { toRecord } from '@sim/utils/object'
import { and, eq } from 'drizzle-orm'
import { decryptSecret, encryptSecret } from '@/lib/core/security/encryption'
import { acquireAdvisoryXactLock, withLockTimeout } from '@/lib/db/advisory-locks'
import type { DbOrTx } from '@/lib/db/types'
import { NexoraGatewayError, type NexoraGatewayFailure } from '@/lib/nexora/gateway-error'
import { gatewayModelName, nexoraGatewayUrl } from '@/lib/nexora/gateway-url'
import { NEXORA_OIDC_PROVIDER_ID } from '@/lib/nexora/oidc'

const logger = createLogger('NexoraGateway')

/** The site route that gives a signed-in person their gateway key (`{ url, model, key }`). */
const ACCESS_PATH = '/api/oauth/workstudio-access'
const ACCESS_TIMEOUT_MS = 10_000
const LOCK_TIMEOUT_MS = 15_000
/** A sign-in token this close to its end is treated as ended: the call could outlive it. */
const TOKEN_MARGIN_MS = 30_000
/** The key goes into an Authorization header: printable characters only, no space. */
const KEY_SHAPE = /^[\x21-\x7e]{16,512}$/
const MODEL_SHAPE = /^[\x21-\x7e]{1,200}$/

interface NexoraGatewayAccess {
  /** The gateway's OpenAI-compatible address, ending in `/v1`. */
  baseUrl: string
  apiKey: string
  /** The model `nexora-default` stands for, for this person. */
  model: string
}

interface StoredKey {
  keyEncrypted: string
  model: string
}

interface SignIn {
  accessToken: string | null
  expiresAt: Date | null
}

export interface GatewayDependencies {
  gatewayUrl: () => string | null
  /** The person a workspace's model calls are paid by, `null` for an unknown workspace. */
  billedUserOf: (workspaceId: string) => Promise<string | null>
  readKey: (userId: string, executor?: DbOrTx) => Promise<StoredKey | null>
  deleteKey: (userId: string) => Promise<void>
  writeKey: (userId: string, row: StoredKey, executor?: DbOrTx) => Promise<void>
  /** The person's sign-in through the site, `null` for an account that never used it. */
  readSignIn: (userId: string, executor?: DbOrTx) => Promise<SignIn | null>
  requestAccess: (accessToken: string) => Promise<{ key: string; model: string }>
  withLock: <T>(userId: string, work: (executor?: DbOrTx) => Promise<T>) => Promise<T>
  encrypt: (value: string) => Promise<string>
  decrypt: (value: string) => Promise<string>
  now?: () => number
}

interface RoutableRequest {
  model: string
  apiKey?: string
  workspaceId?: string
  userId?: string
  azureEndpoint?: string
}

/** Why the site answered 403: its `error` (a string, or `{ code }`) names the reason. */
async function refusalOf(response: Response): Promise<NexoraGatewayFailure> {
  const body = toRecord(await response.json().catch(() => null))
  const reason = toStringOrNull(body.error) ?? toStringOrNull(toRecord(body.error).code)
  if (reason === 'two_factor_required') return 'two-factor-required'
  if (reason === 'email_not_verified') return 'email-not-verified'
  if (reason === 'subscription_required') return 'subscription-required'
  return 'site-refused'
}

/**
 * Asks the site for the signed-in person's gateway key. The address in the answer is ignored:
 * the gateway is a setting of the instance, so a forged answer cannot send keys elsewhere.
 */
export async function requestWorkstudioAccess(
  accessToken: string,
  { gatewayUrl, fetchFn = fetch }: { gatewayUrl: string; fetchFn?: typeof fetch }
): Promise<{ key: string; model: string }> {
  let response: Response
  try {
    // boundary-raw-fetch: the site is a separate service, not a same-origin route
    response = await fetchFn(`${new URL(gatewayUrl).origin}${ACCESS_PATH}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(ACCESS_TIMEOUT_MS),
    })
  } catch {
    throw new NexoraGatewayError('site-unavailable')
  }
  if (response.status === 401) throw new NexoraGatewayError('session-expired')
  if (response.status === 403) throw new NexoraGatewayError(await refusalOf(response))
  if (!response.ok) throw new NexoraGatewayError('site-unavailable')
  const body = toRecord(await response.json().catch(() => null))
  const { key, model } = body
  if (typeof key !== 'string' || !KEY_SHAPE.test(key)) throw new NexoraGatewayError('bad-answer')
  if (typeof model !== 'string' || !MODEL_SHAPE.test(model)) {
    throw new NexoraGatewayError('bad-answer')
  }
  return { key, model }
}

/**
 * Nexora edition: each person's own key to the site's model gateway. Models are paid from the
 * wallet of the person billed for the workspace (`billedAccountUserId`: the person themselves in a
 * personal workspace). The key is made once, from the person's sign-in through the site, kept
 * encrypted, and read only by the server.
 */
export function createNexoraGateway(deps: GatewayDependencies) {
  const now = deps.now ?? Date.now

  async function open(baseUrl: string, stored: StoredKey): Promise<NexoraGatewayAccess | null> {
    try {
      return { baseUrl, apiKey: await deps.decrypt(stored.keyEncrypted), model: stored.model }
    } catch {
      logger.warn('A stored gateway key cannot be read; making a new one')
      return null
    }
  }

  async function forUser(userId: string): Promise<NexoraGatewayAccess | null> {
    const baseUrl = deps.gatewayUrl()
    if (!baseUrl) return null
    const stored = await deps.readKey(userId)
    const known = stored ? await open(baseUrl, stored) : null
    if (known) return known

    return deps.withLock(userId, async (executor) => {
      const again = await deps.readKey(userId, executor)
      const madeMeanwhile = again ? await open(baseUrl, again) : null
      if (madeMeanwhile) return madeMeanwhile

      const signIn = await deps.readSignIn(userId, executor)
      if (!signIn) return null
      const expired = signIn.expiresAt && signIn.expiresAt.getTime() - TOKEN_MARGIN_MS <= now()
      if (!signIn.accessToken || expired) throw new NexoraGatewayError('session-expired')

      const granted = await deps.requestAccess(signIn.accessToken)
      await deps.writeKey(
        userId,
        { keyEncrypted: await deps.encrypt(granted.key), model: granted.model },
        executor
      )
      logger.info('Gateway key made', { userId })
      return { baseUrl, apiKey: granted.key, model: granted.model }
    })
  }

  /**
   * The access of whoever pays for the call: the workspace's billed person, else the acting
   * person. `null` when this instance does not use the gateway, or for an operator account that
   * never signed in through the site (it keeps the instance key).
   */
  async function resolve(input: {
    workspaceId?: string | null
    userId?: string | null
  }): Promise<NexoraGatewayAccess | null> {
    if (!deps.gatewayUrl()) return null
    const userId = input.workspaceId ? await deps.billedUserOf(input.workspaceId) : input.userId
    if (!userId) throw new NexoraGatewayError('no-owner')
    return forUser(userId)
  }

  /** Makes the key of a person who just arrived; a failure is logged and the next use retries. */
  async function ensure(userId: string): Promise<void> {
    try {
      await forUser(userId)
    } catch (error) {
      logger.warn('Gateway key not made at sign-in', {
        userId,
        code: error instanceof NexoraGatewayError ? error.code : 'unexpected',
      })
    }
  }

  /**
   * The request as the gateway wants it: its address, the payer's key, the payer's default model.
   * A block that names its own endpoint is left alone, so the key never goes to an address the
   * operator did not set.
   */
  async function route<T extends RoutableRequest>(request: T): Promise<T> {
    if (request.azureEndpoint) return request
    const access = await resolve({ workspaceId: request.workspaceId, userId: request.userId })
    if (!access) return request
    return {
      ...request,
      apiKey: access.apiKey,
      azureEndpoint: access.baseUrl,
      model: gatewayModelName(request.model, access.model),
    }
  }

  /**
   * The gateway no longer accepts the key of whoever pays for this call (revoked, expired): drops it
   * so the next call asks the site for a new one while the person's sign-in lasts, and otherwise
   * says to sign in again. Never throws: it runs while another failure is being reported.
   */
  async function forget(input: {
    workspaceId?: string | null
    userId?: string | null
  }): Promise<void> {
    try {
      if (!deps.gatewayUrl()) return
      const userId = input.workspaceId ? await deps.billedUserOf(input.workspaceId) : input.userId
      if (userId) await deps.deleteKey(userId)
    } catch (error) {
      logger.warn('A rejected gateway key could not be dropped', {
        error: getErrorMessage(error, 'unknown'),
      })
    }
  }

  return { resolve, ensure, route, forget }
}

async function readKeyRow(userId: string, executor: DbOrTx = db): Promise<StoredKey | null> {
  const [row] = await executor
    .select({ keyEncrypted: nexoraGatewayKey.keyEncrypted, model: nexoraGatewayKey.model })
    .from(nexoraGatewayKey)
    .where(eq(nexoraGatewayKey.userId, userId))
    .limit(1)
  return row ?? null
}

const gateway = createNexoraGateway({
  gatewayUrl: nexoraGatewayUrl,
  deleteKey: async (userId) => {
    await db.delete(nexoraGatewayKey).where(eq(nexoraGatewayKey.userId, userId))
  },
  billedUserOf: async (workspaceId) => {
    const [row] = await db
      .select({ userId: workspace.billedAccountUserId })
      .from(workspace)
      .where(eq(workspace.id, workspaceId))
      .limit(1)
    return row?.userId ?? null
  },
  readKey: readKeyRow,
  writeKey: async (userId, row, executor = db) => {
    const at = new Date()
    await executor
      .insert(nexoraGatewayKey)
      .values({ userId, ...row, createdAt: at, updatedAt: at })
      .onConflictDoUpdate({ target: nexoraGatewayKey.userId, set: { ...row, updatedAt: at } })
  },
  readSignIn: async (userId, executor = db) => {
    const [row] = await executor
      .select({ accessToken: account.accessToken, expiresAt: account.accessTokenExpiresAt })
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, NEXORA_OIDC_PROVIDER_ID)))
      .limit(1)
    return row ?? null
  },
  requestAccess: (accessToken) => {
    const gatewayUrl = nexoraGatewayUrl()
    if (!gatewayUrl) throw new NexoraGatewayError('site-unavailable')
    return requestWorkstudioAccess(accessToken, { gatewayUrl })
  },
  withLock: (userId, work) =>
    db.transaction(async (tx) => {
      await withLockTimeout(tx, LOCK_TIMEOUT_MS, () =>
        acquireAdvisoryXactLock(tx, 'nexora_gateway_key', userId)
      )
      return work(tx)
    }),
  encrypt: async (value) => (await encryptSecret(value)).encrypted,
  decrypt: async (value) => (await decryptSecret(value)).decrypted,
})

export { NexoraGatewayError }

/** See {@link createNexoraGateway}. */
export const resolveGatewayAccess = gateway.resolve
export const ensureNexoraGatewayKey = gateway.ensure
export const routeThroughNexoraGateway = gateway.route
export const forgetNexoraGatewayKey = gateway.forget
