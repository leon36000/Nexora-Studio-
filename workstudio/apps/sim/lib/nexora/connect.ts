import { db, runOutsideTransactionContext } from '@sim/db'
import { mcpServers } from '@sim/db/schema'
import { createLogger } from '@sim/logger'
import { and, eq, isNull } from 'drizzle-orm'
import { env } from '@/lib/core/config/env'
import { acquireAdvisoryXactLock, withLockTimeout } from '@/lib/db/advisory-locks'
import type {
  PerformCreateMcpServerParams,
  PerformMcpServerResult,
} from '@/lib/mcp/orchestration/server-lifecycle'
import { generateMcpServerId } from '@/lib/mcp/utils'
import type { WorkspaceConnection } from '@/lib/nexora/connect-admin'
import {
  CONNECT_TOKEN_PENDING,
  connectTokenNeedsRepair,
  withConnectToken,
} from '@/lib/nexora/connect-headers'

const logger = createLogger('NexoraConnect')

export const NEXORA_CONNECT_SERVER_NAME = 'Nexora Connect'

/** How long a token upkeep waits for another one of the same workspace to finish. */
const TOKEN_LOCK_TIMEOUT_MS = 15_000

interface NexoraConnectConfig {
  url: string
  token: string
}

interface WorkspaceRef {
  workspaceId: string
  userId: string
}

interface ConnectServerRecord {
  id: string
  headers: unknown
}

type CreateMcpServer = (
  params: Omit<PerformCreateMcpServerParams, 'source' | 'actorName' | 'actorEmail' | 'request'>
) => Promise<PerformMcpServerResult>

/** What keeping a workspace isolated in Nexora Connect needs; absent without Connect administration. */
export interface IsolationDependencies {
  /** Runs `work` alone for this workspace (no other token upkeep of it at the same time). */
  lock: <T>(workspaceId: string, work: () => Promise<T>) => Promise<T>
  /** The workspace's live « Nexora Connect » server, or `null` when it has none. */
  findServer: (workspaceId: string) => Promise<ConnectServerRecord | null>
  syncToken: (
    workspaceId: string,
    options: { recreate: boolean }
  ) => Promise<{ token?: string; connections: WorkspaceConnection[] }>
  revokeToken: (workspaceId: string) => Promise<void>
  /** Stores `token` on the workspace's server (created again when missing); throws on failure. */
  writeServer: (
    params: WorkspaceRef & { token: string; server: ConnectServerRecord | null }
  ) => Promise<void>
}

interface Dependencies {
  config: NexoraConnectConfig | null
  create: CreateMcpServer
  isolation?: IsolationDependencies
}

/** Nexora Connect endpoint from `NEXORA_CONNECT_MCP_URL` / `NEXORA_CONNECT_TOKEN`, or `null`. */
function configFromEnv(): NexoraConnectConfig | null {
  const url = env.NEXORA_CONNECT_MCP_URL?.trim()
  const token = env.NEXORA_CONNECT_TOKEN?.trim()
  return url && token ? { url, token } : null
}

/**
 * Holds the workspace's token lock for the duration of `work`. The transaction exists only to keep the
 * advisory lock: `work` reads and writes through the shared pool (its writes must commit on their own,
 * and Connect calls are slow), so it is declared as deliberate global-pool work instead of tripping the
 * pool's « query issued inside a transaction callback » error on every workspace creation.
 */
export async function lockWorkspaceToken<T>(
  workspaceId: string,
  work: () => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await withLockTimeout(tx, TOKEN_LOCK_TIMEOUT_MS, () =>
      acquireAdvisoryXactLock(tx, 'nexora_connect_token', workspaceId)
    )
    return runOutsideTransactionContext(work)
  })
}

function serverRegistration(workspace: WorkspaceRef, url: string, token: string) {
  return {
    workspaceId: workspace.workspaceId,
    userId: workspace.userId,
    name: NEXORA_CONNECT_SERVER_NAME,
    url,
    transport: 'streamable-http' as const,
    authType: 'headers' as const,
    headers: { Authorization: `Bearer ${token}` },
  }
}

function isolationFromEnv(config: NexoraConnectConfig): IsolationDependencies {
  return {
    lock: lockWorkspaceToken,
    findServer: async (workspaceId) => {
      const [server] = await db
        .select({ id: mcpServers.id, headers: mcpServers.headers })
        .from(mcpServers)
        .where(
          and(
            eq(mcpServers.id, generateMcpServerId(workspaceId, config.url)),
            eq(mcpServers.workspaceId, workspaceId),
            isNull(mcpServers.deletedAt)
          )
        )
        .limit(1)
      return server ?? null
    },
    syncToken: async (workspaceId, options) => {
      const { syncWorkspaceToken } = await import('@/lib/nexora/connect-admin')
      return syncWorkspaceToken(workspaceId, options)
    },
    revokeToken: async (workspaceId) => {
      const { revokeWorkspaceToken } = await import('@/lib/nexora/connect-admin')
      await revokeWorkspaceToken(workspaceId)
    },
    // The token goes through the MCP orchestration, which evicts pooled connections and clears the
    // discovery cache; an existing server keeps its name, state, timeout and retries.
    writeServer: async ({ token, server, ...workspace }) => {
      const { performCreateMcpServer, performUpdateMcpServer } = await import(
        '@/lib/mcp/orchestration/server-lifecycle'
      )
      const result = server
        ? await performUpdateMcpServer({
            workspaceId: workspace.workspaceId,
            userId: workspace.userId,
            serverId: server.id,
            allowDestinationChange: false,
            headers: withConnectToken(server.headers, token),
            writesNexoraConnectToken: true,
          })
        : await performCreateMcpServer({
            ...serverRegistration(workspace, config.url, token),
            existingServerBehavior: 'update',
            writesNexoraConnectToken: true,
          })
      if (!result.success) {
        throw new Error(`Nexora Connect server not updated: ${result.error ?? 'unknown error'}`)
      }
    },
  }
}

function defaultDependencies(): Dependencies {
  const config = configFromEnv()
  return {
    config,
    create: createFromLifecycle,
    isolation: config && env.NEXORA_CONNECT_ADMIN_TOKEN ? isolationFromEnv(config) : undefined,
  }
}

async function createFromLifecycle(
  params: Parameters<CreateMcpServer>[0]
): Promise<PerformMcpServerResult> {
  const { createMcpServer } = await import('@/lib/mcp/orchestration/server-lifecycle')
  return createMcpServer(params)
}

function defaultIsolation(): IsolationDependencies | undefined {
  return defaultDependencies().isolation
}

/**
 * Keeps a workspace's « Nexora Connect » server on the workspace's own token, limited to exactly
 * the workspace's connections, and returns those connections. A server that is missing, holds the
 * shared runtime token or the pending placeholder gets a fresh token; otherwise only the token's
 * grant is brought in line (written only when it differs). Runs alone per workspace. A token that
 * could not be put on the server is revoked and the error thrown, so the next call starts again.
 * `null` without Connect administration.
 */
export async function reconcileWorkspaceConnect(
  workspace: WorkspaceRef,
  isolation: IsolationDependencies | undefined = defaultIsolation()
): Promise<WorkspaceConnection[] | null> {
  if (!isolation) return null
  return isolation.lock(workspace.workspaceId, async () => {
    const server = await isolation.findServer(workspace.workspaceId)
    const recreate = !server || connectTokenNeedsRepair(server.headers)
    const { token, connections } = await isolation.syncToken(workspace.workspaceId, { recreate })
    if (token) {
      try {
        await isolation.writeServer({ ...workspace, token, server })
      } catch (error) {
        await isolation.revokeToken(workspace.workspaceId).catch((revokeError: unknown) => {
          logger.warn('Uninstalled Nexora Connect token not revoked', {
            workspaceId: workspace.workspaceId,
            error: revokeError,
          })
        })
        throw error
      }
    }
    return connections
  })
}

const repairsInFlight = new Map<string, Promise<void>>()

/**
 * Best-effort, deduplicated {@link reconcileWorkspaceConnect} for a workspace whose server was
 * seen without its own token (tool discovery). Never throws.
 */
export function repairWorkspaceConnect(workspace: WorkspaceRef): Promise<void> {
  const inFlight = repairsInFlight.get(workspace.workspaceId)
  if (inFlight) return inFlight
  const repair = reconcileWorkspaceConnect(workspace)
    .then(() => undefined)
    .catch((error: unknown) => {
      logger.warn('Nexora Connect isolation not repaired', {
        workspaceId: workspace.workspaceId,
        error,
      })
    })
    .finally(() => repairsInFlight.delete(workspace.workspaceId))
  repairsInFlight.set(workspace.workspaceId, repair)
  return repair
}

/**
 * Nexora edition: every workspace starts with Nexora Connect registered as an MCP server, so its
 * tools are available without setup. With Connect administration set up, the server carries the
 * workspace's own token, limited to the workspace's connections; when that token cannot be made,
 * the server is registered with a placeholder that reaches nothing (`pending`) and is repaired on
 * the next visit of the connectors or tool discovery — never with the shared runtime token, which
 * reaches every workspace's connections. Best-effort: a failure never blocks workspace creation.
 */
export async function ensureNexoraConnectServer(
  workspace: WorkspaceRef,
  deps: Dependencies = defaultDependencies()
): Promise<'skipped' | 'created' | 'exists' | 'pending' | 'failed'> {
  const { config } = deps
  if (!config) return 'skipped'
  if (deps.isolation) {
    try {
      await reconcileWorkspaceConnect(workspace, deps.isolation)
      return 'created'
    } catch (error) {
      logger.warn('Workspace token for Nexora Connect not created; the server waits for a repair', {
        workspaceId: workspace.workspaceId,
        error,
      })
    }
  }
  const token = deps.isolation ? CONNECT_TOKEN_PENDING : config.token
  try {
    const result = await deps.create({
      ...serverRegistration(workspace, config.url, token),
      existingServerBehavior: 'reject',
      writesNexoraConnectToken: true,
    })
    if (result.success) return deps.isolation ? 'pending' : 'created'
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

/** A deleted workspace's connections and token are removed from Nexora Connect. Never throws. */
export async function forgetWorkspaceInConnect(workspaceId: string): Promise<void> {
  if (!env.NEXORA_CONNECT_ADMIN_TOKEN) return
  try {
    const { removeWorkspaceFromConnect } = await import('@/lib/nexora/connect-admin')
    await removeWorkspaceFromConnect(workspaceId)
  } catch (error) {
    logger.warn('Deleted workspace not removed from Nexora Connect', { workspaceId, error })
  }
}
