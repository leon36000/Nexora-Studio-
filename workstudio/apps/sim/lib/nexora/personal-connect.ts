import { db } from '@sim/db'
import { nexoraPersonalConnectToken } from '@sim/db/schema'
import { createLogger } from '@sim/logger'
import { generateId } from '@sim/utils/id'
import { and, eq } from 'drizzle-orm'
import { LRUCache } from 'lru-cache'
import { env } from '@/lib/core/config/env'
import { decryptSecret, encryptSecret } from '@/lib/core/security/encryption'
import { acquireAdvisoryXactLock, withLockTimeout } from '@/lib/db/advisory-locks'
import type { DbOrTx } from '@/lib/db/types'
import { generateMcpServerId } from '@/lib/mcp/utils'
import {
  ConnectRefusedError,
  ConnectUnavailableError,
  listPersonalConnections,
  syncPersonalToken,
  type WorkspaceConnection,
} from '@/lib/nexora/connect-admin'

const logger = createLogger('NexoraPersonalConnect')

/** How long a verified grant is trusted before Connect is asked again. */
const FRESH_MS = 30_000
const LOCK_TIMEOUT_MS = 15_000

/**
 * Nexora Connect cannot be asked for a member who has their own connections. The member's call
 * fails: it never falls back to the workspace's token, which would act with another account.
 */
export class PersonalConnectUnavailableError extends Error {
  constructor() {
    super('Personal connections are unavailable')
    this.name = 'PersonalConnectUnavailableError'
  }
}

interface TokenRow {
  connectTokenId: string
  tokenEncrypted: string
  grantHash: string
}

interface Member {
  workspaceId: string
  userId: string
}

export interface PersonalConnectDependencies {
  isConfigured: () => boolean
  listPersonal: (userId: string) => Promise<WorkspaceConnection[]>
  sync: (input: Member & { existingTokenId?: string }) => Promise<{
    tokenId: string
    token?: string
    grantHash: string
  }>
  /** `executor` is the transaction holding the member's lock, when there is one. */
  readRow: (member: Member, executor?: DbOrTx) => Promise<TokenRow | null>
  writeRow: (member: Member, row: TokenRow, executor?: DbOrTx) => Promise<void>
  withLock: <T>(key: string, work: (executor?: DbOrTx) => Promise<T>) => Promise<T>
  encrypt: (value: string) => Promise<string>
  decrypt: (value: string) => Promise<string>
  now?: () => number
}

/**
 * Nexora edition: the headers that make a call to Nexora Connect act as a member rather than as
 * their workspace. `null` when the member has no connection of their own (the workspace's token
 * stays in use). The member's token is made on first use, kept encrypted, and its grant checked
 * against their connections at most every {@link FRESH_MS}. Only the server calls this; the token
 * is never returned by any route.
 */
export function createPersonalConnectResolver(deps: PersonalConnectDependencies) {
  const fresh = new LRUCache<string, true>({
    max: 5_000,
    ttl: FRESH_MS,
    ttlResolution: 0,
    ...(deps.now ? { perf: { now: deps.now } } : {}),
  })

  async function resolve(member: Member): Promise<Record<string, string> | null> {
    if (!deps.isConfigured()) return null
    const key = `${member.userId}:${member.workspaceId}`
    let personal: WorkspaceConnection[]
    try {
      personal = await deps.listPersonal(member.userId)
    } catch (error) {
      if (!(error instanceof ConnectUnavailableError)) throw error
      if (await deps.readRow(member)) throw new PersonalConnectUnavailableError()
      return null
    }
    if (personal.length === 0) return null

    const token = await deps.withLock(key, async (executor) => {
      const row = await deps.readRow(member, executor)
      if (row && fresh.has(key)) return deps.decrypt(row.tokenEncrypted)
      let synced: Awaited<ReturnType<PersonalConnectDependencies['sync']>>
      try {
        synced = await deps.sync({ ...member, existingTokenId: row?.connectTokenId })
      } catch (error) {
        if (error instanceof ConnectUnavailableError || error instanceof ConnectRefusedError) {
          throw new PersonalConnectUnavailableError()
        }
        throw error
      }
      fresh.set(key, true)
      if (synced.token) {
        await deps.writeRow(
          member,
          {
            connectTokenId: synced.tokenId,
            tokenEncrypted: await deps.encrypt(synced.token),
            grantHash: synced.grantHash,
          },
          executor
        )
        return synced.token
      }
      if (!row) throw new PersonalConnectUnavailableError()
      if (row.grantHash !== synced.grantHash) {
        await deps.writeRow(member, { ...row, grantHash: synced.grantHash }, executor)
      }
      return deps.decrypt(row.tokenEncrypted)
    })
    return { Authorization: `Bearer ${token}` }
  }

  return {
    resolve,
    /** A member's connections changed: the next call checks the grant again. */
    forget(_userId?: string): void {
      fresh.clear()
    },
  }
}

async function lockMember<T>(key: string, work: (executor?: DbOrTx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await withLockTimeout(tx, LOCK_TIMEOUT_MS, () =>
      acquireAdvisoryXactLock(tx, 'nexora_personal_connect_token', key)
    )
    return work(tx)
  })
}

const resolver = createPersonalConnectResolver({
  isConfigured: () => Boolean(env.NEXORA_CONNECT_ADMIN_TOKEN?.trim()),
  listPersonal: (userId) => listPersonalConnections(userId),
  sync: (input) => syncPersonalToken(input),
  readRow: async ({ userId, workspaceId }, executor = db) => {
    const [row] = await executor
      .select({
        connectTokenId: nexoraPersonalConnectToken.connectTokenId,
        tokenEncrypted: nexoraPersonalConnectToken.tokenEncrypted,
        grantHash: nexoraPersonalConnectToken.grantHash,
      })
      .from(nexoraPersonalConnectToken)
      .where(
        and(
          eq(nexoraPersonalConnectToken.userId, userId),
          eq(nexoraPersonalConnectToken.workspaceId, workspaceId)
        )
      )
      .limit(1)
    return row ?? null
  },
  writeRow: async ({ userId, workspaceId }, row, executor = db) => {
    const now = new Date()
    await executor
      .insert(nexoraPersonalConnectToken)
      .values({ id: generateId(), userId, workspaceId, ...row, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: [nexoraPersonalConnectToken.userId, nexoraPersonalConnectToken.workspaceId],
        set: { ...row, updatedAt: now },
      })
  },
  withLock: lockMember,
  encrypt: async (value) => (await encryptSecret(value)).encrypted,
  decrypt: async (value) => (await decryptSecret(value)).decrypted,
})

/**
 * Headers acting as the member in Nexora Connect (see {@link createPersonalConnectResolver}).
 * Throws {@link PersonalConnectUnavailableError} rather than ever acting as the workspace.
 */
function resolvePersonalConnectHeaders(member: Member): Promise<Record<string, string> | null> {
  return resolver.resolve(member).catch((error: unknown) => {
    if (error instanceof PersonalConnectUnavailableError) {
      logger.warn('Personal connections unavailable', { workspaceId: member.workspaceId })
    }
    throw error
  })
}

/** Whether `serverId` is the workspace's « Nexora Connect » MCP server (the one `connectUrl` names). */
export function isNexoraConnectServer(
  serverId: string,
  workspaceId: string,
  connectUrl: string
): boolean {
  return connectUrl.trim() !== '' && serverId === generateMcpServerId(workspaceId, connectUrl)
}

/**
 * The headers that make a tool call on `serverId` act as `memberId`: only for the workspace's
 * Nexora Connect server, and only for a member who has connections of their own. `undefined`
 * otherwise (the call keeps the server's own token). Throws rather than acting as the workspace.
 */
export async function connectHeadersForMember(input: {
  serverId: string
  workspaceId: string
  memberId: string
}): Promise<Record<string, string> | undefined> {
  if (!isNexoraConnectServer(input.serverId, input.workspaceId, env.NEXORA_CONNECT_MCP_URL ?? '')) {
    return undefined
  }
  const headers = await resolvePersonalConnectHeaders({
    workspaceId: input.workspaceId,
    userId: input.memberId,
  })
  return headers ?? undefined
}

/** A member's connections changed: their token's grant is checked again on the next call. */
export function forgetPersonalConnectGrants(userId: string): void {
  resolver.forget(userId)
}
