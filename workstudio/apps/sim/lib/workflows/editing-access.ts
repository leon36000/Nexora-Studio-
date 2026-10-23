import { getActiveWorkflowContext } from '@sim/platform-authz/workflow'
import { isWorkspaceCapabilityWithheld } from '@/lib/permission-groups/capability-assertions'

/**
 * Whether `userId`'s permission group withholds `workflows.edit` in the workspace that owns
 * `workflowId`, or `null` when the workflow is gone.
 *
 * permission-group-enforced: workflows.edit — the realtime server persists canvas edits itself,
 * outside every application operation, and cannot resolve permission groups; it asks through
 * `/api/internal/workflow-edit-access` and folds a refusal into a read-only role. The caller has
 * already established the user's role, so this answers the group alone.
 */
export async function isWorkflowEditingWithheldForUser(
  userId: string,
  workflowId: string
): Promise<boolean | null> {
  const context = await getActiveWorkflowContext(workflowId)
  if (!context) return null
  return isWorkspaceCapabilityWithheld(
    userId,
    context.workspaceId,
    'workflows.edit',
    context.workspaceOrganizationId
  )
}
