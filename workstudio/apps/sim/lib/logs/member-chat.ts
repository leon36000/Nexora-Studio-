import { toStringOrNull } from '@sim/utils/coerce'
import { toRecord } from '@sim/utils/object'
import { taskOwnerOf } from '@/lib/nexora/acting-member'
import { getUserEntityPermissions } from '@/lib/workspaces/permissions/utils'

/**
 * The member a run of a members-only (`workspace`) deployed chat answered, as its log's trigger
 * recorded it; `null` for every other run. Read from the stored row, whose slim payload keeps
 * the trigger inline.
 */
function memberChatUserIdOf(executionData: unknown): string | null {
  const trigger = toRecord(toRecord(executionData).trigger)
  return toStringOrNull(toRecord(trigger.data).memberChatUserId)
}

/**
 * Nexora edition: what was said in a members-only chat, and what a member's scheduled task read
 * and wrote in their accounts (the run's input, output, trace and block payloads), is read only
 * by the member and by the workspace's admins; any other reader, a member or a reader with no
 * person to name, gets the log without them. Every run of a task's workflow counts, however it
 * started: who deployed the task can change after the run, the log's owner cannot. Returns a
 * check per run, `true` when its payloads must be withheld; the viewer's role is looked up once,
 * and only for a private run someone else held, and each workflow's task owner once.
 */
export function memberChatPayloadGate(
  viewerUserId: string | null | undefined,
  workspaceId: string
): (executionData: unknown, run?: { workflowId?: string | null }) => Promise<boolean> {
  let viewerIsAdmin: Promise<boolean> | null = null
  const taskOwners = new Map<string, Promise<string | null>>()
  const taskOwnerOfWorkflow = (workflowId: string): Promise<string | null> => {
    let owner = taskOwners.get(workflowId)
    if (!owner) {
      owner = taskOwnerOf(workflowId, workspaceId)
      taskOwners.set(workflowId, owner)
    }
    return owner
  }
  return async (executionData, run) => {
    const memberUserId =
      memberChatUserIdOf(executionData) ??
      (run?.workflowId ? await taskOwnerOfWorkflow(run.workflowId) : null)
    if (!memberUserId || memberUserId === viewerUserId) return false
    if (!viewerUserId) return true
    viewerIsAdmin ??= getUserEntityPermissions(viewerUserId, 'workspace', workspaceId).then(
      (permission) => permission === 'admin'
    )
    return !(await viewerIsAdmin)
  }
}
