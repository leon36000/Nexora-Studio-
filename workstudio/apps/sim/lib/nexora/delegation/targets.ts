import { db } from '@sim/db'
import { folder, workflow } from '@sim/db/schema'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { AGENTS_FOLDER } from '@/lib/nexora/agents'
import type { AgentHandoff } from '@/lib/nexora/delegation/handoffs'
import type { DelegationAgentInfo } from '@/lib/nexora/delegation/run'
import type { DelegationTarget } from '@/lib/nexora/delegation/tool'

/**
 * The workflows of the workspace among `workflowIds` (archived ones excluded), each flagged as a
 * published agent when it is deployed and sits in the top-level « Agents » folder.
 */
export async function loadDelegationAgents(
  workspaceId: string,
  workflowIds: string[]
): Promise<DelegationAgentInfo[]> {
  if (workflowIds.length === 0) return []
  const rows = await db
    .select({
      workflowId: workflow.id,
      name: workflow.name,
      description: workflow.description,
      isDeployed: workflow.isDeployed,
      folderName: folder.name,
      folderParentId: folder.parentId,
      folderDeletedAt: folder.deletedAt,
    })
    .from(workflow)
    .leftJoin(folder, eq(workflow.folderId, folder.id))
    .where(
      and(
        eq(workflow.workspaceId, workspaceId),
        inArray(workflow.id, workflowIds),
        isNull(workflow.archivedAt)
      )
    )
  return rows.map((row) => ({
    workflowId: row.workflowId,
    name: row.name,
    description: row.description,
    published:
      row.isDeployed === true &&
      row.folderName === AGENTS_FOLDER &&
      row.folderParentId === null &&
      row.folderDeletedAt === null,
  }))
}

/**
 * The agents a calling agent can offer to its model: its handoffs that are still published, in
 * the order of the list, each with the mode it was given.
 */
export async function loadDelegationTargets(
  workspaceId: string,
  handoffs: readonly AgentHandoff[]
): Promise<Array<{ target: DelegationTarget; handoff: AgentHandoff }>> {
  const agents = new Map(
    (
      await loadDelegationAgents(
        workspaceId,
        handoffs.map((handoff) => handoff.agentId)
      )
    ).map((agent) => [agent.workflowId, agent])
  )
  return handoffs.flatMap((handoff) => {
    const agent = agents.get(handoff.agentId)
    if (!agent?.published) return []
    return [
      {
        handoff,
        target: { workflowId: agent.workflowId, name: agent.name, description: agent.description },
      },
    ]
  })
}
