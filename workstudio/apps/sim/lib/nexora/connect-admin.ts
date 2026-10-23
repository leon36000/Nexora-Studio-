import { getErrorMessage } from '@sim/utils/errors'
import { isRecordLike, toArray } from '@sim/utils/object'
import { LRUCache } from 'lru-cache'
import { env } from '@/lib/core/config/env'

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
      const record = isRecordLike(payload) ? payload : {}
      const error = isRecordLike(record.error) ? record.error : {}
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
  await call('DELETE', `/api/connections/${encodeURIComponent(service)}`, {
    connectionName: workspaceConnectionName(workspaceId),
  })
}

/**
 * Keeps the workspace's runtime token limited to exactly its connections, creating the token the
 * first time. Nexora Connect shows a token's secret only at creation: `token` is set then, and the
 * caller stores it in the workspace's « Nexora Connect » MCP server.
 */
export async function syncWorkspaceToken(
  workspaceId: string,
  options: ConnectAdminOptions & { recreate?: boolean } = {}
): Promise<{ token?: string }> {
  const call = createClient(options)
  const [connections, tokens] = await Promise.all([
    listWorkspaceConnections(workspaceId, options),
    call<unknown>('GET', '/api/runtime-tokens'),
  ])
  const grant = connections.length > 0 ? connections.map((c) => c.id) : [NO_CONNECTION_GRANT]
  const policy = {
    allowedActions: [],
    blockedActions: [],
    allowedProxies: [],
    allowedConnections: grant,
    allowedTriggers: [],
  }
  const name = workspaceTokenName(workspaceId)
  const existing = toArray(tokens)
    .filter(isRecordLike)
    .find((t) => t.name === name && typeof t.id === 'string')
  if (existing && options.recreate) {
    await call('DELETE', `/api/runtime-tokens/${existing.id}`)
  } else if (existing) {
    await call('PUT', `/api/runtime-tokens/${existing.id}`, policy)
    return {}
  }
  const created = await call<Record<string, unknown>>('POST', '/api/runtime-tokens', {
    name,
    ...policy,
  })
  return { token: String(created.token) }
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
    const execution = isRecordLike(p.execution) ? p.execution : {}
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
  return (await catalogFor(options))
    .filter((entry) => !filter.category || entry.categories.includes(filter.category))
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
    call<Record<string, unknown>>('GET', `/v1/providers/${encodeURIComponent(service)}/setup`),
  ])
  const entry = catalog.find((e) => e.service === service)
  return {
    service: entry ? (({ actions: _actions, ...rest }) => rest)(entry) : null,
    auth: toArray(setup.auth).filter(isRecordLike),
    oauthClient: isRecordLike(setup.oauthClient) ? setup.oauthClient : null,
    actions: entry?.actions ?? [],
  }
}

/** Where an OAuth consent started with `startOAuth` stands. */
export async function getOAuthStatus(
  requestId: string,
  options: ConnectAdminOptions = {}
): Promise<{ status: string; service: string; errorMessage: string | null }> {
  const call = createClient(options)
  const request = await call<Record<string, unknown>>(
    'GET',
    `/v1/connection-requests/${encodeURIComponent(requestId)}`
  )
  return {
    status: text(request.status),
    service: text(request.service),
    errorMessage: textOrNull(request.errorMessage),
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

/** Whether Nexora Connect already holds the workspace's own token (workspaces created before J5 do not). */
export async function hasWorkspaceToken(
  workspaceId: string,
  options: ConnectAdminOptions = {}
): Promise<boolean> {
  const call = createClient(options)
  const name = workspaceTokenName(workspaceId)
  return toArray(await call<unknown>('GET', '/api/runtime-tokens'))
    .filter(isRecordLike)
    .some((t) => t.name === name)
}
