import { db } from '@sim/db'
import { workflow } from '@sim/db/schema'
import { createLogger } from '@sim/logger'
import { toNumberOrNull, toStringOrNull } from '@sim/utils/coerce'
import { getErrorMessage } from '@sim/utils/errors'
import { toRecord } from '@sim/utils/object'
import { eq } from 'drizzle-orm'
import type { WorkflowExecutionLog } from '@/lib/logs/types'
import { draftFromExecution } from '@/lib/nexora/traces/from-execution'
import { recordTrace } from '@/lib/nexora/traces/record'
import { takeRunOrigin } from '@/lib/nexora/traces/run-origin'
import type { RunOriginHint, TraceDraft } from '@/lib/nexora/traces/types'

const logger = createLogger('NexoraRunTrace')

export interface RunTraceDeps {
  workflowName: (workflowId: string) => Promise<string | null>
  record: (draft: TraceDraft) => Promise<void>
  takeOrigin: (executionId: string) => RunOriginHint | undefined
}

const defaultDeps: RunTraceDeps = {
  async workflowName(workflowId) {
    const [row] = await db
      .select({ name: workflow.name })
      .from(workflow)
      .where(eq(workflow.id, workflowId))
      .limit(1)
    return row?.name ?? null
  },
  record: (draft) => recordTrace(draft),
  takeOrigin: takeRunOrigin,
}

interface RunTraceInput {
  /** The completed log, with its full in-memory execution data. */
  log: WorkflowExecutionLog
  workspaceId: string | null
  status: 'completed' | 'failed' | 'cancelled' | 'pending'
  actorUserId: string | null
}

/**
 * Nexora edition: the trace of a finished workflow run (an agent, an Assistant turn, an agent
 * called through the developer API, a plain workflow), built from the spans its execution log
 * just recorded. A paused run waits for its resume, which completes it. Never rejects: a trace
 * must not disturb the run's completion.
 */
export async function recordRunTrace(
  { log, workspaceId, status, actorUserId }: RunTraceInput,
  deps: RunTraceDeps = defaultDeps
): Promise<void> {
  try {
    const hint = deps.takeOrigin(log.executionId)
    if (status === 'pending' || !workspaceId) return
    const data = log.executionData
    const tokens = toRecord(data.tokens)
    const input = toNumberOrNull(tokens.input)
    const output = toNumberOrNull(tokens.output)
    const workflowId = log.workflowId ?? ''
    const failed = status !== 'completed'
    await deps.record(
      draftFromExecution({
        executionId: log.executionId,
        workspaceId,
        workflow: { id: workflowId, name: (await deps.workflowName(workflowId)) ?? workflowId },
        traceSpans: data.traceSpans ?? [],
        trigger: log.trigger,
        memberChatUserId: toStringOrNull(toRecord(toRecord(data.trigger).data).memberChatUserId),
        actorUserId,
        status: failed ? 'error' : 'ok',
        durationMs: log.totalDurationMs,
        startedAt: new Date(log.startedAt),
        error: failed
          ? (data.error ??
            data.completionFailure ??
            (status === 'cancelled' ? 'Exécution annulée' : null))
          : null,
        workflowInput: (data as Record<string, unknown>).workflowInput,
        finalOutput: (data as Record<string, unknown>).finalOutput,
        tokens:
          input !== null || output !== null ? { input: input ?? 0, output: output ?? 0 } : null,
        hint,
      })
    )
  } catch (error) {
    logger.warn('The trace of a run could not be built', {
      executionId: log.executionId,
      error: getErrorMessage(error),
    })
  }
}
