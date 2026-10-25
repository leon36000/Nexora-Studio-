import { sha256Hex } from '@sim/security/hash'
import { getErrorMessage } from '@sim/utils/errors'
import { isRecordLike, toArray, toRecord, toRecordOrNull } from '@sim/utils/object'
import { LRUCache } from 'lru-cache'
import { env } from '@/lib/core/config/env'
import { catalogCategoryKey } from '@/lib/nexora/connect-categories'

/** Nexora Connect cannot be reached, or refuses WorkStudio's administration token. */
export class ConnectUnavailableError extends Error {
  constructor(detail: string) {
    super(`Nexora Connect administration is unavailable: ${detail}`)
    this.name = 'ConnectUnavailableError'
  }
}

/** Nexora Connect refused a request for a reason the person can act on (e.g. a key the provider rejects). */
export class ConnectRefusedError extends Error {
  constructor(readonly code: string) {
    super(`Nexora Connect refused the request (${code})`)
    this.name = 'ConnectRefusedError'
  }
}

interface ConnectAdminConfig {
  /** Nexora Connect origin, e.g. `http://nexora-connect:3000`. */
  baseUrl: string
  adminToken: string
}

interface ConnectAdminOptions {
  config?: ConnectAdminConfig
  fetchFn?: typeof fetch
}

export interface WorkspaceConnection {
  id: string
  service: string
  authType: string
}

/** Grants nothing: a token limited to no connection would otherwise be unlimited. */
const NO_CONNECTION_GRANT = 'nexora-no-connection'

function configFromEnv(): ConnectAdminConfig {
  const explicit = env.NEXORA_CONNECT_ADMIN_URL?.trim()
  const fromMcp = env.NEXORA_CONNECT_MCP_URL?.trim()
  const baseUrl = explicit || (fromMcp ? new URL(fromMcp).origin : '')
  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    adminToken: env.NEXORA_CONNECT_ADMIN_TOKEN?.trim() ?? '',
  }
}

/** Name of a workspace's connection in Nexora Connect (one per service and workspace). */
export function workspaceConnectionName(workspaceId: string): string {
  return `ws-${workspaceId}`
}

function workspaceTokenName(workspaceId: string): string {
  return `workstudio-ws-${workspaceId}`
}

function createClient(options: ConnectAdminOptions) {
  const config = options.config ?? configFromEnv()
  const fetchFn = options.fetchFn ?? fetch

  return async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (!config.baseUrl || !config.adminToken) throw new ConnectUnavailableError('not configured')
    let response: Response
    try {
      // boundary-raw-fetch: Nexora Connect is a separate service, not a same-origin route
      response = await fetchFn(`${config.baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.adminToken}`,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      })
    } catch (error) {
      throw new ConnectUnavailableError(getErrorMessage(error, 'request failed'))
    }
    const payload: unknown = await response.json().catch(() => ({}))
    if (response.status === 401 || response.status === 403 || response.status >= 500) {
      throw new ConnectUnavailableError(
        `${method} ${path.split('?')[0]} answered HTTP ${response.status}`
      )
    }
    if (!response.ok) {
      const record = toRecord(payload)
      const error = toRecord(record.error)
      const code =
        typeof error.code === 'string'
          ? error.code
          : typeof record.errorCode === 'string'
            ? record.errorCode
            : 'refused'
      throw new ConnectRefusedError(code)
    }
    // `/v1` answers in an envelope; `/api` answers raw.
    return (
      isRecordLike(payload) && 'success' in payload && 'data' in payload ? payload.data : payload
    ) as T
  }
}

/** The workspace's stored connections (virtual no-auth services excluded). */
export async function listWorkspaceConnections(
  workspaceId: string,
  options: ConnectAdminOptions = {}
): Promise<WorkspaceConnection[]> {
  const call = createClient(options)
  const name = workspaceConnectionName(workspaceId)
  const connections = toArray(await call<unknown>('GET', '/api/connections')).filter(isRecordLike)
  return connections
    .filter((c) => c.connectionName === name && c.virtual !== true && typeof c.id === 'string')
    .map((c) => ({ id: String(c.id), service: String(c.service), authType: String(c.authType) }))
}

/** Saves (or replaces) the workspace's connection to `service` with an API key or custom credentials. */
export async function connectWithCredentials(
  workspaceId: string,
  service: string,
  authType: 'api_key' | 'custom_credential',
  values: Record<string, string>,
  options: ConnectAdminOptions = {}
): Promise<WorkspaceConnection> {
  const call = createClient(options)
  const saved = await call<Record<string, unknown>>(
    'PUT',
    `/api/connections/${encodeURIComponent(service)}`,
    { authType, connectionName: workspaceConnectionName(workspaceId), values }
  )
  return { id: String(saved.id), service, authType }
}

/**
 * Starts the OAuth consent for the workspace's connection to `service`. The page opens
 * `authorizationUrl` in a window and polls the request until it is connected.
 */
export async function startOAuth(
  workspaceId: string,
  service: string,
  options: ConnectAdminOptions = {}
): Promise<{ requestId: string; authorizationUrl: string }> {
  const call = createClient(options)
  const request = await call<Record<string, unknown>>('POST', '/api/oauth/connection-requests', {
    service,
    connectionName: workspaceConnectionName(workspaceId),
  })
  return {
    requestId: String(request.connectionRequestId),
    authorizationUrl: String(request.authorizationUrl),
  }
}

/** Removes the workspace's connection to `service`. */
export async function disconnect(
  workspaceId: string,
  service: string,
  options: ConnectAdminOptions = {}
): Promise<void> {
  const call = createClient(options)
  try {
    await call('DELETE', `/api/connections/${encodeURIComponent(service)}`, {
      connectionName: workspaceConnectionName(workspaceId),
    })
  } catch (error) {
    // Already removed (another tab, the Connect console): the workspace is disconnected all the same.
    if (error instanceof ConnectRefusedError && error.code === 'connection_not_found') return
    throw error
  }
}

interface TokenPolicy {
  allowedActions: string[]
  blockedActions: string[]
  allowedProxies: string[]
  allowedConnections: string[]
  allowedTriggers: string[]
}

const POLICY_KEYS = [
  'allowedActions',
  'blockedActions',
  'allowedProxies',
  'allowedConnections',
  'allowedTriggers',
] as const

function samePolicy(token: Record<string, unknown>, policy: TokenPolicy): boolean {
  return POLICY_KEYS.every((key) => {
    const current = toArray(token[key]).filter((v): v is string => typeof v === 'string')
    const wanted = policy[key]
    return current.length === wanted.length && wanted.every((value) => current.includes(value))
  })
}

async function listWorkspaceTokens(
  call: ReturnType<typeof createClient>,
  workspaceId: string
): Promise<Record<string, unknown>[]> {
  const name = workspaceTokenName(workspaceId)
  return toArray(await call<unknown>('GET', '/api/runtime-tokens'))
    .filter(isRecordLike)
    .filter((t) => t.name === name && typeof t.id === 'string')
}

/**
 * Keeps the workspace's runtime token limited to exactly its connections, creating the token the
 * first time. Nexora Connect shows a token's secret only at creation: `token` is set then, and the
 * caller stores it in the workspace's « Nexora Connect » MCP server. With `recreate`, or when
 * several tokens carry the workspace's name (no telling which one the server holds), every one is
 * revoked and a single fresh token is made. The grant is written only when it differs. Callers
 * serialize per workspace (see `reconcileWorkspaceConnect`).
 */
export async function syncWorkspaceToken(
  workspaceId: string,
  options: ConnectAdminOptions & { recreate?: boolean } = {}
): Promise<{ token?: string; connections: WorkspaceConnection[] }> {
  const call = createClient(options)
  const [connections, existing] = await Promise.all([
    listWorkspaceConnections(workspaceId, options),
    listWorkspaceTokens(call, workspaceId),
  ])
  const policy: TokenPolicy = {
    allowedActions: [],
    blockedActions: [],
    allowedProxies: [],
    allowedConnections:
      connections.length > 0 ? connections.map((c) => c.id) : [NO_CONNECTION_GRANT],
    allowedTriggers: [],
  }
  if (existing.length === 1 && !options.recreate) {
    const [token] = existing
    if (!samePolicy(token, policy)) await call('PUT', `/api/runtime-tokens/${token.id}`, policy)
    return { connections }
  }
  for (const token of existing) await call('DELETE', `/api/runtime-tokens/${token.id}`)
  const created = await call<Record<string, unknown>>('POST', '/api/runtime-tokens', {
    name: workspaceTokenName(workspaceId),
    ...policy,
  })
  return { token: String(created.token), connections }
}

/** Revokes the workspace's runtime token (all of them, should several carry its name). */
export async function revokeWorkspaceToken(
  workspaceId: string,
  options: ConnectAdminOptions = {}
): Promise<void> {
  const call = createClient(options)
  for (const token of await listWorkspaceTokens(call, workspaceId)) {
    await call('DELETE', `/api/runtime-tokens/${token.id}`)
  }
}

/** A deleted workspace leaves nothing in Nexora Connect: its connections and its token go. */
export async function removeWorkspaceFromConnect(
  workspaceId: string,
  options: ConnectAdminOptions = {}
): Promise<void> {
  for (const connection of await listWorkspaceConnections(workspaceId, options)) {
    await disconnect(workspaceId, connection.service, options)
  }
  await revokeWorkspaceToken(workspaceId, options)
}

/** Name of a member's own connection in Nexora Connect (one per service and member, instance-wide). */
export function personalConnectionName(userId: string): string {
  return `u-${userId}`
}

function personalTokenName(userId: string, workspaceId: string): string {
  return `workstudio-u-${userId}-w-${workspaceId}`
}

async function listConnectionsNamed(
  call: ReturnType<typeof createClient>,
  name: string
): Promise<WorkspaceConnection[]> {
  const connections = toArray(await call<unknown>('GET', '/api/connections')).filter(isRecordLike)
  return connections
    .filter((c) => c.connectionName === name && c.virtual !== true && typeof c.id === 'string')
    .map((c) => ({ id: String(c.id), service: String(c.service), authType: String(c.authType) }))
}

/** The member's own stored connections (virtual no-auth services excluded). */
export async function listPersonalConnections(
  userId: string,
  options: ConnectAdminOptions = {}
): Promise<WorkspaceConnection[]> {
  return listConnectionsNamed(createClient(options), personalConnectionName(userId))
}

/** Saves (or replaces) the member's connection to `service` with an API key or custom credentials. */
export async function connectPersonalWithCredentials(
  userId: string,
  service: string,
  authType: 'api_key' | 'custom_credential',
  values: Record<string, string>,
  options: ConnectAdminOptions = {}
): Promise<WorkspaceConnection> {
  const call = createClient(options)
  const saved = await call<Record<string, unknown>>(
    'PUT',
    `/api/connections/${encodeURIComponent(service)}`,
    { authType, connectionName: personalConnectionName(userId), values }
  )
  return { id: String(saved.id), service, authType }
}

/** Starts the OAuth consent for the member's own connection to `service`. */
export async function startPersonalOAuth(
  userId: string,
  service: string,
  options: ConnectAdminOptions = {}
): Promise<{ requestId: string; authorizationUrl: string }> {
  const call = createClient(options)
  const request = await call<Record<string, unknown>>('POST', '/api/oauth/connection-requests', {
    service,
    connectionName: personalConnectionName(userId),
  })
  return {
    requestId: String(request.connectionRequestId),
    authorizationUrl: String(request.authorizationUrl),
  }
}

/** Removes the member's connection to `service`; one already removed counts as removed. */
export async function disconnectPersonal(
  userId: string,
  service: string,
  options: ConnectAdminOptions = {}
): Promise<void> {
  const call = createClient(options)
  try {
    await call('DELETE', `/api/connections/${encodeURIComponent(service)}`, {
      connectionName: personalConnectionName(userId),
    })
  } catch (error) {
    if (error instanceof ConnectRefusedError && error.code === 'connection_not_found') return
    throw error
  }
}

interface PersonalTokenSync {
  tokenId: string
  /** The secret, only when the token was just created; Connect shows it once. */
  token?: string
  grantHash: string
}

/**
 * Keeps the member's runtime token for one workspace limited to exactly: their own connections,
 * and the workspace's for the services they did not connect themselves (their own wins, so a call
 * that names no connection has one answer). Created when `existingTokenId` is absent or no longer
 * known to Connect (the secret comes back then); otherwise only its grant is brought in line, and
 * only when it differs. Callers serialize per member and workspace.
 */
export async function syncPersonalToken(
  input: { userId: string; workspaceId: string; existingTokenId?: string },
  options: ConnectAdminOptions = {}
): Promise<PersonalTokenSync> {
  const call = createClient(options)
  const [personal, workspace, tokens] = await Promise.all([
    listConnectionsNamed(call, personalConnectionName(input.userId)),
    listConnectionsNamed(call, workspaceConnectionName(input.workspaceId)),
    call<unknown>('GET', '/api/runtime-tokens').then((list) => toArray(list).filter(isRecordLike)),
  ])
  const own = new Set(personal.map((c) => c.service))
  const granted = [...personal, ...workspace.filter((c) => !own.has(c.service))].map((c) => c.id)
  const allowedConnections = granted.length > 0 ? granted : [NO_CONNECTION_GRANT]
  const grantHash = sha256Hex([...allowedConnections].sort().join('\n'))
  const policy: TokenPolicy = {
    allowedActions: [],
    blockedActions: [],
    allowedProxies: [],
    allowedConnections,
    allowedTriggers: [],
  }
  const name = personalTokenName(input.userId, input.workspaceId)
  const existing = input.existingTokenId
    ? tokens.find((t) => t.id === input.existingTokenId && t.name === name)
    : undefined
  if (existing) {
    if (!samePolicy(existing, policy)) {
      await call('PUT', `/api/runtime-tokens/${existing.id}`, policy)
    }
    return { tokenId: String(existing.id), grantHash }
  }
  // No token we can use: any other one of this name has a secret nobody holds.
  for (const stale of tokens.filter((t) => t.name === name && typeof t.id === 'string')) {
    await call('DELETE', `/api/runtime-tokens/${stale.id}`)
  }
  const created = await call<Record<string, unknown>>('POST', '/api/runtime-tokens', {
    name,
    ...policy,
  })
  return {
    tokenId: String(toRecord(created.record).id),
    token: String(created.token),
    grantHash,
  }
}

/** Revokes a member's runtime token; one already gone counts as revoked. */
export async function revokePersonalToken(
  tokenId: string,
  options: ConnectAdminOptions = {}
): Promise<void> {
  const call = createClient(options)
  try {
    await call('DELETE', `/api/runtime-tokens/${encodeURIComponent(tokenId)}`)
  } catch (error) {
    if (error instanceof ConnectRefusedError && error.code === 'runtime_token_not_found') return
    throw error
  }
}

export interface CatalogService {
  service: string
  displayName: string
  description: string
  categories: string[]
  authTypes: string[]
  iconUrl: string | null
  homepageUrl: string | null
  actionCount: number
}

interface CatalogEntry extends CatalogService {
  actions: { id: string; name: string; description: string }[]
}

/** The catalog changes only when Nexora Connect is updated; ~1,650 services, read once per 10 min. */
const catalogCache = new LRUCache<string, CatalogEntry[]>({ max: 4, ttl: 10 * 60_000 })

const text = (value: unknown) => (typeof value === 'string' ? value : '')
const textOrNull = (value: unknown) => (typeof value === 'string' && value ? value : null)
const strings = (value: unknown) => toArray(value).filter((v): v is string => typeof v === 'string')

async function catalogFor(options: ConnectAdminOptions): Promise<CatalogEntry[]> {
  const baseUrl = (options.config ?? configFromEnv()).baseUrl
  const cached = catalogCache.get(baseUrl)
  if (cached) return cached
  const call = createClient(options)
  const providers = toArray(await call<unknown>('GET', '/api/providers')).filter(isRecordLike)
  const catalog = providers.map((p): CatalogEntry => {
    const execution = toRecord(p.execution)
    return {
      service: text(p.service),
      displayName: text(p.displayName) || text(p.service),
      description: text(p.description),
      categories: strings(p.categories),
      authTypes: strings(p.authTypes),
      iconUrl: textOrNull(p.iconUrl),
      homepageUrl: textOrNull(p.homepageUrl),
      actionCount: typeof execution.actionCount === 'number' ? execution.actionCount : 0,
      actions: toArray(p.actions)
        .filter(isRecordLike)
        .map((a) => ({ id: text(a.id), name: text(a.name), description: text(a.description) })),
    }
  })
  catalogCache.set(baseUrl, catalog)
  return catalog
}

/** Services of the catalog matching a search (name, service id or description) and a category. */
export async function listCatalog(
  filter: { query?: string; category?: string },
  options: ConnectAdminOptions = {}
): Promise<CatalogService[]> {
  const query = filter.query?.trim().toLowerCase() ?? ''
  const categoryKey = filter.category ? catalogCategoryKey(filter.category) : ''
  return (await catalogFor(options))
    .filter(
      (entry) => !categoryKey || entry.categories.some((c) => catalogCategoryKey(c) === categoryKey)
    )
    .filter(
      (entry) =>
        !query ||
        entry.displayName.toLowerCase().includes(query) ||
        entry.service.includes(query) ||
        entry.description.toLowerCase().includes(query)
    )
    .map(({ actions: _actions, ...service }) => service)
}

/** A service's setup (credential fields, OAuth client state) and its actions, for its page. */
export async function getServiceDetail(
  service: string,
  options: ConnectAdminOptions = {}
): Promise<{
  service: CatalogService | null
  auth: Record<string, unknown>[]
  oauthClient: Record<string, unknown> | null
  actions: { id: string; name: string; description: string }[]
}> {
  const call = createClient(options)
  const [catalog, setup] = await Promise.all([
    catalogFor(options),
    call<Record<string, unknown>>(
      'GET',
      `/v1/providers/${encodeURIComponent(service)}/setup`
    ).catch((error: unknown) => {
      if (error instanceof ConnectRefusedError && error.code === 'unknown_service') return null
      throw error
    }),
  ])
  if (!setup) return { service: null, auth: [], oauthClient: null, actions: [] }
  const entry = catalog.find((e) => e.service === service)
  return {
    service: entry ? (({ actions: _actions, ...rest }) => rest)(entry) : null,
    auth: toArray(setup.auth).filter(isRecordLike),
    oauthClient: toRecordOrNull(setup.oauthClient),
    actions: entry?.actions ?? [],
  }
}

/** Where an OAuth consent started with `startOAuth` stands. */
export async function getOAuthStatus(
  requestId: string,
  options: ConnectAdminOptions = {}
): Promise<{
  status: string
  service: string
  errorMessage: string | null
  errorCode: string | null
}> {
  const call = createClient(options)
  const request = await call<Record<string, unknown>>(
    'GET',
    `/v1/connection-requests/${encodeURIComponent(requestId)}`
  )
  return {
    status: text(request.status),
    service: text(request.service),
    errorMessage: textOrNull(request.errorMessage),
    errorCode: textOrNull(request.errorCode),
  }
}

/** Saves the operator's OAuth application for a service; returns the callback address to register. */
export async function setOAuthApp(
  service: string,
  app: { clientId: string; clientSecret: string },
  options: ConnectAdminOptions = {}
): Promise<{ configured: boolean; redirectUri: string | null }> {
  const call = createClient(options)
  const saved = await call<Record<string, unknown>>(
    'PUT',
    `/api/oauth/configs/${encodeURIComponent(service)}`,
    app
  )
  return {
    configured: saved.configured === true,
    redirectUri: textOrNull(saved.expectedRedirectUri),
  }
}

export type ActionOperationType = 'read' | 'write' | 'destructive'

const ACTION_ID = /^[a-z0-9_-]+\.[A-Za-z0-9_.-]+$/
const operationTypes = new LRUCache<string, ActionOperationType | 'unknown'>({
  max: 2_000,
  ttl: 10 * 60 * 1000,
})

/**
 * What Nexora Connect says an action of its catalogue does (read, write or destructive); `null`
 * when it does not know the action. The answer is kept ten minutes: the catalogue changes with
 * Connect's version, not per request. An unreachable Connect throws.
 */
export async function getActionOperationType(
  actionId: string,
  options: ConnectAdminOptions = {}
): Promise<ActionOperationType | null> {
  if (!ACTION_ID.test(actionId)) return null
  const known = operationTypes.get(actionId)
  if (known !== undefined) return known === 'unknown' ? null : known
  const call = createClient(options)
  let operation: ActionOperationType | null
  try {
    const detail = toRecord(
      await call<unknown>('GET', `/api/actions/${encodeURIComponent(actionId)}`)
    )
    const type = detail.operationType
    operation = type === 'read' || type === 'write' || type === 'destructive' ? type : null
  } catch (error) {
    if (!(error instanceof ConnectRefusedError)) throw error
    operation = null
  }
  operationTypes.set(actionId, operation ?? 'unknown')
  return operation
}
