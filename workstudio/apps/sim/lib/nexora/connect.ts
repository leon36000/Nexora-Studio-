import { createLogger } from '@sim/logger'
import { env } from '@/lib/core/config/env'
import type {
  PerformCreateMcpServerParams,
  PerformMcpServerResult,
} from '@/lib/mcp/orchestration/server-lifecycle'

const logger = createLogger('NexoraConnect')

export const NEXORA_CONNECT_SERVER_NAME = 'Nexora Connect'

interface NexoraConnectConfig {
  url: string
  token: string
}

type CreateMcpServer = (
  params: Omit<PerformCreateMcpServerParams, 'source' | 'actorName' | 'actorEmail' | 'request'>
) => Promise<PerformMcpServerResult>

interface Dependencies {
  config: NexoraConnectConfig | null
  create: CreateMcpServer
  /** Creates or refreshes the workspace's own limited token; absent without Connect administration. */
  syncToken?: (workspaceId: string) => Promise<{ token?: string }>
}

/** Nexora Connect endpoint from `NEXORA_CONNECT_MCP_URL` / `NEXORA_CONNECT_TOKEN`, or `null`. */
function configFromEnv(): NexoraConnectConfig | null {
  const url = env.NEXORA_CONNECT_MCP_URL?.trim()
  const token = env.NEXORA_CONNECT_TOKEN?.trim()
  return url && token ? { url, token } : null
}

async function recreateWorkspaceToken(workspaceId: string): Promise<{ token?: string }> {
  const { syncWorkspaceToken } = await import('@/lib/nexora/connect-admin')
  return syncWorkspaceToken(workspaceId, { recreate: true })
}

function defaultDependencies(): Dependencies {
  return {
    config: configFromEnv(),
    create: createFromLifecycle,
    syncToken: env.NEXORA_CONNECT_ADMIN_TOKEN ? recreateWorkspaceToken : undefined,
  }
}

async function createFromLifecycle(
  params: Parameters<CreateMcpServer>[0]
): Promise<PerformMcpServerResult> {
  const { createMcpServer } = await import('@/lib/mcp/orchestration/server-lifecycle')
  return createMcpServer(params)
}

/** The token a workspace's server uses: its own limited one, else the shared runtime token. */
async function workspaceToken(
  workspaceId: string,
  deps: Dependencies,
  shared: string
): Promise<string> {
  if (!deps.syncToken) return shared
  try {
    return (await deps.syncToken(workspaceId)).token ?? shared
  } catch (error) {
    logger.warn('Workspace token for Nexora Connect not created; using the shared token', {
      workspaceId,
      error,
    })
    return shared
  }
}

/**
 * Nexora edition: every workspace starts with Nexora Connect registered as an MCP
 * server, so its tools are available without setup. With Connect administration set up,
 * the server uses the workspace's own token, limited to the workspace's connections.
 * Best-effort and idempotent: an existing registration is kept, and a failure never
 * blocks workspace creation.
 */
export async function ensureNexoraConnectServer(
  workspace: { workspaceId: string; userId: string },
  deps: Dependencies = defaultDependencies()
): Promise<'skipped' | 'created' | 'exists' | 'failed'> {
  if (!deps.config) return 'skipped'
  try {
    const token = await workspaceToken(workspace.workspaceId, deps, deps.config.token)
    const result = await deps.create({
      workspaceId: workspace.workspaceId,
      userId: workspace.userId,
      name: NEXORA_CONNECT_SERVER_NAME,
      url: deps.config.url,
      transport: 'streamable-http',
      authType: 'headers',
      headers: { Authorization: `Bearer ${token}` },
      existingServerBehavior: 'reject',
    })
    if (result.success) return 'created'
    if (result.errorCode === 'conflict') return 'exists'
    logger.warn('Nexora Connect was not registered', {
      workspaceId: workspace.workspaceId,
      error: result.error,
    })
    return 'failed'
  } catch (error) {
    logger.warn('Nexora Connect registration failed', { workspaceId: workspace.workspaceId, error })
    return 'failed'
  }
}

/** Puts a new token on the workspace's « Nexora Connect » server (created again if it was removed). */
export async function applyWorkspaceConnectToken(
  workspace: { workspaceId: string; userId: string },
  token: string,
  deps: Dependencies = defaultDependencies()
): Promise<boolean> {
  if (!deps.config) return false
  const result = await deps.create({
    workspaceId: workspace.workspaceId,
    userId: workspace.userId,
    name: NEXORA_CONNECT_SERVER_NAME,
    url: deps.config.url,
    transport: 'streamable-http',
    authType: 'headers',
    headers: { Authorization: `Bearer ${token}` },
    existingServerBehavior: 'update',
  })
  return result.success
}
