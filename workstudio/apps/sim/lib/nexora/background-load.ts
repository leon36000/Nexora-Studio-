import { db } from '@sim/db'
import { workflowExecutionLogs } from '@sim/db/schema'
import { and, eq, gt, inArray } from 'drizzle-orm'
import { createLimiter } from '@/lib/nexora/evaluations/runner'

/** Model calls of all campaigns and batches at once on this server: the Assistant keeps the rest of the CPU. */
const INSTANCE_CALL_LIMIT = 4
const INTERACTIVE_RUN_LOOKBACK_MS = 10 * 60_000

/** How long an interactive model call (Playground, API call, Copilot) counts as "someone is waiting". */
export const INTERACTIVE_ACTIVITY_WINDOW_MS = 15_000

/** The shared cap on background model calls (evaluation campaigns and batches alike). */
export const instanceLimiter = createLimiter(INSTANCE_CALL_LIMIT)

interface InteractiveGateDeps {
  now: () => number
  hasRunningInteractiveRun: () => Promise<boolean>
}

/**
 * Tells background work when a person is waiting: a chat or manual workflow run is in progress, or
 * an interactive model call started in the last {@link INTERACTIVE_ACTIVITY_WINDOW_MS}.
 */
export function createInteractiveGate(deps: InteractiveGateDeps) {
  let lastActivityAt = Number.NEGATIVE_INFINITY
  return {
    note(at: number = deps.now()) {
      lastActivityAt = at
    },
    async busy(): Promise<boolean> {
      if (deps.now() - lastActivityAt < INTERACTIVE_ACTIVITY_WINDOW_MS) return true
      return deps.hasRunningInteractiveRun()
    },
  }
}

async function hasRunningInteractiveRun(): Promise<boolean> {
  const [row] = await db
    .select({ id: workflowExecutionLogs.id })
    .from(workflowExecutionLogs)
    .where(
      and(
        eq(workflowExecutionLogs.status, 'running'),
        inArray(workflowExecutionLogs.trigger, ['chat', 'manual']),
        gt(workflowExecutionLogs.startedAt, new Date(Date.now() - INTERACTIVE_RUN_LOOKBACK_MS))
      )
    )
    .limit(1)
  return Boolean(row)
}

const gate = createInteractiveGate({ now: Date.now, hasRunningInteractiveRun })

/** Whether a person is waiting on a run or a model call right now. */
export const interactiveBusy = gate.busy

/** Notes the start of an interactive model call: background work yields to it for a few seconds. */
export const noteInteractiveActivity = gate.note
