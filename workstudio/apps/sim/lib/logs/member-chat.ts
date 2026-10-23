import { toStringOrNull } from '@sim/utils/coerce'
import { toRecord } from '@sim/utils/object'
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
 * Nexora edition: what was said in a members-only chat (the run's input, output, trace and block
 * payloads) is read only by the member who chatted and by the workspace's admins; any other
 * reader, a member or a reader with no person to name, gets the log without them. Returns a
 * check per run, `true` when its payloads must be withheld; the viewer's role is looked up once,
 * and only for a members-only chat run someone else held.
 */
export function memberChatPayloadGate(
  viewerUserId: string | null | undefined,
  workspaceId: string
): (executionData: unknown) => Promise<boolean> {
  let viewerIsAdmin: Promise<boolean> | null = null
  return async (executionData) => {
    const memberUserId = memberChatUserIdOf(executionData)
    if (!memberUserId || memberUserId === viewerUserId) return false
    if (!viewerUserId) return true
    viewerIsAdmin ??= getUserEntityPermissions(viewerUserId, 'workspace', workspaceId).then(
      (permission) => permission === 'admin'
    )
    return !(await viewerIsAdmin)
  }
}
