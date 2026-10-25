type StepStatus = 'idle' | 'running' | 'success' | 'error'

export interface StepResult {
  status: StepStatus
  durationMs?: number
  output?: unknown
  error?: string
}

/** The fields of a console entry the Steps view reads. */
interface ConsoleEntryLike {
  blockId: string
  executionId?: string
  executionOrder: number
  timestamp: string
  startedAt?: string
  isRunning?: boolean
  isCanceled?: boolean
  success?: boolean
  durationMs?: number
  output?: unknown
  error?: string | Error | null
}

function errorMessage(error: ConsoleEntryLike['error']): string | undefined {
  if (!error) return undefined
  return typeof error === 'string' ? error : error.message
}

function resultOf(entry: ConsoleEntryLike): StepResult {
  if (entry.isCanceled) return { status: 'idle' }
  if (entry.isRunning) return { status: 'running' }
  const error = errorMessage(entry.error)
  if (error || entry.success === false) {
    return { status: 'error', error: error ?? '', durationMs: entry.durationMs }
  }
  return { status: 'success', durationMs: entry.durationMs, output: entry.output }
}

/**
 * What the last run did to each block, read from the console: the entries of the most recent
 * execution only, the latest entry of a block that ran several times.
 */
export function stepResultsFrom(entries: readonly ConsoleEntryLike[]): Map<string, StepResult> {
  const results = new Map<string, StepResult>()
  let latest: ConsoleEntryLike | undefined
  for (const entry of entries) {
    const at = entry.startedAt ?? entry.timestamp
    if (!latest || at > (latest.startedAt ?? latest.timestamp)) latest = entry
  }
  if (!latest) return results
  const executionId = latest.executionId
  const ofRun = entries
    .filter((entry) => entry.executionId === executionId)
    .sort((a, b) => a.executionOrder - b.executionOrder)
  for (const entry of ofRun) results.set(entry.blockId, resultOf(entry))
  return results
}
