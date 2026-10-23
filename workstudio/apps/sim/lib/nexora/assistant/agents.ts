import { db } from '@sim/db'
import { chat, folder, workflow } from '@sim/db/schema'
import { createLogger } from '@sim/logger'
import { toStringOrNull } from '@sim/utils/coerce'
import { toRecord } from '@sim/utils/object'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { defineAuthorizedWorkspaceUseCase } from '@/lib/core/application/authorized-workspace-use-case'
import { AGENTS_FOLDER } from '@/lib/nexora/agents'
import { ensureGeneralAssistantAgent } from '@/lib/nexora/assistant/general-agent'
import { assistantOperations } from '@/lib/nexora/assistant/operations'
import { resolveActiveWorkspaceApplicationContext } from '@/lib/workspaces/application/context'

const logger = createLogger('NexoraAssistantAgents')

/** A published agent: a deployed workflow of the workspace's `Agents` folder with an active chat. */
export interface AssistantAgent {
  workflowId: string
  name: string
  description: string | null
  chatIdentifier: string
  welcomeMessage: string | null
}

/**
 * The workspace's published agents, or the one named by `workflowId`. A workflow with several
 * active chats is offered once, through its oldest chat.
 */
async function loadPublishedAgents(
  workspaceId: string,
  workflowId?: string
): Promise<AssistantAgent[]> {
  const rows = await db
    .select({
      workflowId: workflow.id,
      name: workflow.name,
      description: workflow.description,
      chatIdentifier: chat.identifier,
      customizations: chat.customizations,
    })
    .from(workflow)
    .innerJoin(folder, eq(workflow.folderId, folder.id))
    .innerJoin(chat, eq(chat.workflowId, workflow.id))
    .where(
      and(
        eq(workflow.workspaceId, workspaceId),
        workflowId === undefined ? undefined : eq(workflow.id, workflowId),
        isNull(workflow.archivedAt),
        eq(workflow.isDeployed, true),
        eq(folder.workspaceId, workspaceId),
        eq(folder.resourceType, 'workflow'),
        eq(folder.name, AGENTS_FOLDER),
        isNull(folder.parentId),
        isNull(folder.deletedAt),
        eq(chat.isActive, true),
        isNull(chat.archivedAt)
      )
    )
    .orderBy(asc(workflow.sortOrder), asc(workflow.name), asc(chat.createdAt))

  const agents = new Map<string, AssistantAgent>()
  for (const row of rows) {
    if (agents.has(row.workflowId)) continue
    agents.set(row.workflowId, {
      workflowId: row.workflowId,
      name: row.name,
      description: row.description,
      chatIdentifier: row.chatIdentifier,
      welcomeMessage: toStringOrNull(toRecord(row.customizations).welcomeMessage),
    })
  }
  return [...agents.values()]
}

/** The published agent `workflowId` of the workspace, or `null` when it is not (or no longer) one. */
export async function findPublishedAgent(
  workspaceId: string,
  workflowId: string
): Promise<AssistantAgent | null> {
  const [agent] = await loadPublishedAgents(workspaceId, workflowId)
  return agent ?? null
}

/**
 * The workspace's published agents, the « Assistant général » first. Listing provides the
 * general assistant on first use (see `ensureGeneralAssistantAgent`); when that fails, the
 * failure is logged and the other agents are still offered.
 */
export const listAssistantAgents = defineAuthorizedWorkspaceUseCase({
  operation: assistantOperations.listAgents,
  resolveContext: ({ input }: { input: { workspaceId: string } }) =>
    resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions: {},
  execute: async ({ principal, context, request }) => {
    const general = await ensureGeneralAssistantAgent
      .execute({ principal, input: { workspaceId: context.workspaceId }, request })
      .catch((error: unknown) => {
        logger.error('General assistant could not be provided', {
          workspaceId: context.workspaceId,
          error,
        })
        return null
      })
    const agents = await loadPublishedAgents(context.workspaceId)
    if (!general) return { agents }
    return {
      agents: [
        ...agents.filter((agent) => agent.workflowId === general.workflowId),
        ...agents.filter((agent) => agent.workflowId !== general.workflowId),
      ],
    }
  },
})
