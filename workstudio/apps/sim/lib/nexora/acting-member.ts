import { db } from '@sim/db'
import { nexoraAssistantTask, workflowExecutionLogs } from '@sim/db/schema'
import { and, eq } from 'drizzle-orm'

/**
 * Nexora edition: who a tool call acts for. A run that serves a member's Assistant conversation
 * registers that member under its execution id for as long as its stream lives (like the
 * confirmation sinks, on `globalThis` so the chat route and the tool call share it however they
 * were bundled); a scheduled task acts for its owner, whether the planner or the owner starts it.
 * Anyone else running the task by hand acts for nobody: they never use the owner's accounts.
 */

type MemberRegistry = typeof globalThis & { _nexoraRunMembers?: Map<string, string> }
const holder = globalThis as MemberRegistry
holder._nexoraRunMembers ??= new Map()
const runMembers = holder._nexoraRunMembers

/** Registers the member a run serves; the returned function unregisters it (when the stream ends). */
export function registerRunMember(executionId: string, userId: string): () => void {
  runMembers.set(executionId, userId)
  return () => {
    if (runMembers.get(executionId) === userId) runMembers.delete(executionId)
  }
}

export interface ActingMemberDependencies {
  /** The owner of the Assistant task whose workflow this is, when it is one. */
  taskOwner: (workflowId: string, workspaceId: string) => Promise<string | null>
  /** How the execution was started (`schedule`, `manual`, `chat`…), when its log exists. */
  executionTrigger: (executionId: string, workspaceId: string) => Promise<string | null>
}

const databaseDependencies: ActingMemberDependencies = {
  taskOwner: async (workflowId, workspaceId) => {
    const [row] = await db
      .select({ userId: nexoraAssistantTask.userId })
      .from(nexoraAssistantTask)
      .where(
        and(
          eq(nexoraAssistantTask.workflowId, workflowId),
          eq(nexoraAssistantTask.workspaceId, workspaceId)
        )
      )
      .limit(1)
    return row?.userId ?? null
  },
  executionTrigger: async (executionId, workspaceId) => {
    const [row] = await db
      .select({ trigger: workflowExecutionLogs.trigger })
      .from(workflowExecutionLogs)
      .where(
        and(
          eq(workflowExecutionLogs.executionId, executionId),
          eq(workflowExecutionLogs.workspaceId, workspaceId)
        )
      )
      .limit(1)
    return row?.trigger ?? null
  },
}

interface ActingMemberInput {
  executionId?: string
  workflowId?: string
  workspaceId: string
  /** The user the run is attributed to. */
  actorUserId?: string
}

/** The member a tool call acts for, or `null` when it acts for the workspace. */
export async function resolveActingMember(
  input: ActingMemberInput,
  deps: ActingMemberDependencies = databaseDependencies
): Promise<string | null> {
  const registered = input.executionId ? runMembers.get(input.executionId) : undefined
  if (registered) return registered
  if (!input.workflowId) return null
  const owner = await deps.taskOwner(input.workflowId, input.workspaceId)
  if (!owner) return null
  if (input.actorUserId === owner) return owner
  if (!input.executionId) return null
  return (await deps.executionTrigger(input.executionId, input.workspaceId)) === 'schedule'
    ? owner
    : null
}
