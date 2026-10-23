import { toRecord } from '@sim/utils/object'
import { env, getInternalAppUrl } from '@/env'

/** Bounds one capability question; a join or an operation waits on it at most this long. */
const WORKFLOW_EDIT_ACCESS_TIMEOUT_MS = 5_000

/**
 * Whether the user's permission group withholds workflow editing (`workflows.edit`) in the
 * workspace that owns the workflow.
 *
 * Permission groups are resolved by the app, behind its billing and access-control graph, which
 * this server must not import; it asks over internal HTTP instead, like its other callbacks.
 * Throws on any answer that is not a clear yes or no, so the caller treats it as transient and
 * never as a grant: a join fails as retryable, and a live re-validation keeps the last decision.
 */
export async function isWorkflowEditingWithheld(
  userId: string,
  workflowId: string
): Promise<boolean> {
  const response = await fetch(`${getInternalAppUrl()}/api/internal/workflow-edit-access`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': env.INTERNAL_API_SECRET },
    body: JSON.stringify({ workflowId, userId }),
    signal: AbortSignal.timeout(WORKFLOW_EDIT_ACCESS_TIMEOUT_MS),
  })
  if (!response.ok) {
    await response.body?.cancel()
    throw new Error(`Workflow edit access check failed: ${response.status}`)
  }
  const { withheld } = toRecord(await response.json())
  if (typeof withheld !== 'boolean') {
    throw new Error('Workflow edit access check returned an invalid answer')
  }
  return withheld
}
