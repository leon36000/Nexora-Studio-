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
}

/** Nexora Connect endpoint from `NEXORA_CONNECT_MCP_URL` / `NEXORA_CONNECT_TOKEN`, or `null`. */
function configFromEnv(): NexoraConnectConfig | null {
  const url = env.NEXORA_CONNECT_MCP_URL?.trim()
  const token = env.NEXORA_CONNECT_TOKEN?.trim()
  return url && token ? { url, token } : null
}

async function createFromLifecycle(
  params: Parameters<CreateMcpServer>[0]
): Promise<PerformMcpServerResult> {
  const { createMcpServer } = await import('@/lib/mcp/orchestration/server-lifecycle')
  return createMcpServer(params)
}

/**
 * Nexora edition: every workspace starts with Nexora Connect registered as an MCP
 * server, so its tools are available without setup. Best-effort and idempotent: an
 * existing registration is kept, and a failure never blocks workspace creation.
 */
export async function ensureNexoraConnectServer(
  workspace: { workspaceId: string; userId: string },
  deps: Dependencies = { config: configFromEnv(), create: createFromLifecycle }
): Promise<'skipped' | 'created' | 'exists' | 'failed'> {
  if (!deps.config) return 'skipped'
  try {
    const result = await deps.create({
      workspaceId: workspace.workspaceId,
      userId: workspace.userId,
      name: NEXORA_CONNECT_SERVER_NAME,
      url: deps.config.url,
      transport: 'streamable-http',
      authType: 'headers',
      headers: { Authorization: `Bearer ${deps.config.token}` },
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
