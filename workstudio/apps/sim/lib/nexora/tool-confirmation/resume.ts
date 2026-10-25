import { isRecordLike } from '@sim/utils/object'
import { executeMcpTool } from '@/lib/internal/mcp/execute-tool'
import type { InternalToolOperationContext } from '@/lib/internal/tool-operations/types'
import {
  approvalGranted,
  type DeferredAgentAction,
  type SettledAction,
  settleDeferredActions,
} from '@/lib/nexora/tool-confirmation/deferred'

/** The actions an Agent block held back before its run paused, when its output carries any. */
export function deferredActionsOf(output: unknown): DeferredAgentAction[] {
  if (!isRecordLike(output) || !Array.isArray(output._deferredActions)) return []
  return output._deferredActions.flatMap((entry) =>
    isRecordLike(entry) &&
    typeof entry.toolId === 'string' &&
    typeof entry.title === 'string' &&
    typeof entry.summary === 'string' &&
    isRecordLike(entry.params)
      ? [
          {
            toolId: entry.toolId,
            title: entry.title,
            summary: entry.summary,
            params: entry.params,
          },
        ]
      : []
  )
}

async function runMcpAction(
  action: DeferredAgentAction,
  context: InternalToolOperationContext,
  requestId: string
): Promise<{ success: boolean; output?: unknown; error?: string }> {
  if (!action.toolId.startsWith('mcp-')) {
    return { success: false, error: 'Only MCP actions can be held for approval' }
  }
  const response = await executeMcpTool({
    toolId: action.toolId,
    input: action.params,
    headers: new Headers(),
    context,
    requestId,
  })
  const body: unknown = await response.json().catch(() => null)
  if (isRecordLike(body) && body.success === true) {
    const data = isRecordLike(body.data) ? body.data : {}
    return { success: true, output: data.output ?? body.data }
  }
  return {
    success: false,
    error: isRecordLike(body) && typeof body.error === 'string' ? body.error : 'Action failed',
  }
}

/**
 * What the resumed run adds to the paused Agent block's output: the held actions, run if the
 * person approved (the resume form's submission), refused otherwise. `null` when the block held
 * none. The held parameters leave the output either way.
 */
export async function settleHeldActions(input: {
  pausedOutput: unknown
  submission: unknown
  context: InternalToolOperationContext
  requestId: string
}): Promise<{ actions: SettledAction[] } | null> {
  const held = deferredActionsOf(input.pausedOutput)
  if (held.length === 0) return null
  const actions = await settleDeferredActions(held, approvalGranted(input.submission), (action) =>
    runMcpAction(action, input.context, input.requestId)
  )
  return { actions }
}
