import { dollarsToCredits } from '@/lib/billing/credits/conversion'

/**
 * The cost of a run, in credits, as the logs show it. A person billed by the Nexora AI site pays
 * the site's wallet at the gateway's real prices: WorkStudio's own credit estimate would be a
 * second, different figure, so none is shown (their consumption is on the site).
 */
export function logCostCredits(total: unknown, viaSite: boolean): number | null {
  if (viaSite || typeof total !== 'number' || !Number.isFinite(total)) return null
  return dollarsToCredits(total)
}

interface TraceTokens {
  executionId: string | null
  inputTokens: number
  outputTokens: number
}

export interface LogTokens {
  input: number
  output: number
  total: number
}

/**
 * The tokens each run used, by execution id, from the traces they left. A person billed by the
 * Nexora AI site reads the tokens a run used, the unit the site's wallet is metered in, instead of
 * a cost in WorkStudio's credits.
 */
export function logTokensByExecution(
  traces: readonly TraceTokens[] | undefined
): Map<string, LogTokens> {
  const byExecution = new Map<string, LogTokens>()
  for (const trace of traces ?? []) {
    if (!trace.executionId) continue
    byExecution.set(trace.executionId, {
      input: trace.inputTokens,
      output: trace.outputTokens,
      total: trace.inputTokens + trace.outputTokens,
    })
  }
  return byExecution
}
