import { getErrorMessage } from '@sim/utils/errors'
import type { DeferredAction } from '@/providers/runtime-context'

/**
 * Nexora edition: « Demander avant d'agir » in a workflow run nobody follows (schedule, API,
 * webhook, editor). The flagged action is held back when the agent asks for it; the Agent block
 * then ends in the workflow's own human pause (the resume form's single « Autoriser » switch),
 * and the actions run at resume only if the person approved, once.
 */

export type DeferredAgentAction = DeferredAction

/** The name of the yes/no field of the resume form. */
export const APPROVAL_FIELD = 'autoriser'

export interface SettledAction {
  title: string
  decision: 'allow' | 'deny'
  success: boolean
  output?: unknown
  error?: string
}

export type ExecuteDeferredAction = (
  action: DeferredAgentAction
) => Promise<{ success: boolean; output?: unknown; error?: string }>

/** Whether the resume form's submission is an explicit « Autoriser ». */
export function approvalGranted(submission: unknown): boolean {
  if (typeof submission !== 'object' || submission === null) return false
  const value = (submission as Record<string, unknown>)[APPROVAL_FIELD]
  return value === true || value === 'true'
}

/** What the paused run shows the person: titles and summaries, never the recorded parameters. */
export function pendingActionsView(
  actions: DeferredAgentAction[]
): Array<{ title: string; summary: string }> {
  return actions.map(({ title, summary }) => ({ title, summary }))
}

/** Runs the approved actions one by one (a failure does not stop the next); a refusal runs none. */
export async function settleDeferredActions(
  actions: DeferredAgentAction[],
  approved: boolean,
  execute: ExecuteDeferredAction
): Promise<SettledAction[]> {
  const settled: SettledAction[] = []
  for (const action of actions) {
    if (!approved) {
      settled.push({ title: action.title, decision: 'deny', success: false })
      continue
    }
    try {
      const result = await execute(action)
      settled.push({
        title: action.title,
        decision: 'allow',
        success: result.success,
        ...(result.output === undefined ? {} : { output: result.output }),
        ...(result.error === undefined ? {} : { error: result.error }),
      })
    } catch (error) {
      settled.push({
        title: action.title,
        decision: 'allow',
        success: false,
        error: getErrorMessage(error, 'Action failed'),
      })
    }
  }
  return settled
}
