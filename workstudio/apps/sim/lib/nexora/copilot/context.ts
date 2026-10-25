import { db } from '@sim/db'
import { knowledgeBase, mcpServers } from '@sim/db/schema'
import { createLogger } from '@sim/logger'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { NEXORA_CONNECT_SERVER_NAME } from '@/lib/nexora/connect'
import {
  ConnectRefusedError,
  ConnectUnavailableError,
  listWorkspaceConnections,
} from '@/lib/nexora/connect-admin'
import type { CompileContext } from '@/lib/nexora/copilot/compile'
import { DEFAULT_MODEL_ALIAS } from '@/lib/nexora/model-ids'

const logger = createLogger('NexoraCopilotContext')

/** Agents the Copilot writes run on the deployment's default model, as blocks store it. */
const COPILOT_AGENT_MODEL = `vllm/${DEFAULT_MODEL_ALIAS}`

/** The services the workspace connected in Nexora Connect; none when Connect cannot be asked. */
async function connectedServices(workspaceId: string): Promise<string[]> {
  try {
    const connections = await listWorkspaceConnections(workspaceId)
    return [...new Set(connections.map((connection) => connection.service))]
  } catch (error) {
    if (error instanceof ConnectUnavailableError || error instanceof ConnectRefusedError) {
      logger.warn('Nexora Connect services not listed for the Copilot', {
        workspaceId,
        error: error.message,
      })
      return []
    }
    throw error
  }
}

/**
 * What a plan's names resolve against in a workspace: its knowledge bases, and its « Nexora
 * Connect » MCP server with the services connected to it (absent when the server is not
 * registered or disabled). The caller has authorized the workspace.
 */
export async function loadCopilotCompileContext(
  workspaceId: string,
  options: { extraServices?: string[] } = {}
): Promise<CompileContext> {
  const [knowledgeBases, [server]] = await Promise.all([
    db
      .select({ id: knowledgeBase.id, name: knowledgeBase.name })
      .from(knowledgeBase)
      .where(and(eq(knowledgeBase.workspaceId, workspaceId), isNull(knowledgeBase.deletedAt)))
      .orderBy(asc(knowledgeBase.name)),
    db
      .select({ id: mcpServers.id })
      .from(mcpServers)
      .where(
        and(
          eq(mcpServers.workspaceId, workspaceId),
          eq(mcpServers.name, NEXORA_CONNECT_SERVER_NAME),
          eq(mcpServers.enabled, true),
          isNull(mcpServers.deletedAt)
        )
      )
      .limit(1),
  ])
  return {
    model: COPILOT_AGENT_MODEL,
    knowledgeBases,
    connect: server
      ? {
          serverId: server.id,
          services: [
            ...new Set([
              ...(await connectedServices(workspaceId)),
              ...(options.extraServices ?? []),
            ]),
          ],
        }
      : undefined,
  }
}
