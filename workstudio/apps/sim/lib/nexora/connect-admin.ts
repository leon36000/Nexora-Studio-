import { getErrorMessage } from '@sim/utils/errors'
import { isRecordLike, toArray } from '@sim/utils/object'
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
