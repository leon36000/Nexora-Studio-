import type { ItemStatus, JudgeVerdict } from '@/lib/nexora/evaluations/types'

/**
 * The `p`-th percentile (0 to 100) of `values` by linear interpolation between ranks, `null`
 * without values. Does not reorder the array it receives.
 */
export function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((left, right) => left - right)
  const rank = (Math.min(Math.max(p, 0), 100) / 100) * (sorted.length - 1)
  const lower = Math.floor(rank)
  const upper = Math.ceil(rank)
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (rank - lower)
}

/** The fields of an item that statistics read. */
export interface SummaryItem {
  status: ItemStatus
  verdict: JudgeVerdict | null
  score: number | null
  latencyMs: number | null
  inputTokens: number
  outputTokens: number
  kgCo2eq: number | null
}

export interface TargetSummary {
  total: number
  /** Items whose answer was produced and judged, or that failed: the denominator of the rate. */
  finished: number
  passed: number
  failed: number
  /** The target or the judge could not complete: not a pass, shown apart from a plain failure. */
  errors: number
  /** `passed / finished`, `null` before any item has finished. */
  passRate: number | null
  meanScore: number | null
  latencyP50: number | null
  latencyP95: number | null
  inputTokens: number
  outputTokens: number
  /** Total carbon of the measured items, `null` when none was measured (never 0). */
  kgCo2eq: number | null
}

/** Statistics of the items of one target of a campaign. */
export function summarizeItems(items: readonly SummaryItem[]): TargetSummary {
  let passed = 0
  let failed = 0
  let errors = 0
  let inputTokens = 0
  let outputTokens = 0
  let co2 = 0
  let co2Measured = false
  const scores: number[] = []
  const latencies: number[] = []

  for (const item of items) {
    inputTokens += item.inputTokens
    outputTokens += item.outputTokens
    if (item.kgCo2eq !== null) {
      co2 += item.kgCo2eq
      co2Measured = true
    }
    if (item.status === 'pending' || item.status === 'running') continue
    if (item.status === 'error' || item.verdict === 'error') errors += 1
    else if (item.verdict === 'pass') passed += 1
    else if (item.verdict === 'fail') failed += 1
    if (item.score !== null) scores.push(item.score)
    if (item.status === 'done' && item.latencyMs !== null) latencies.push(item.latencyMs)
  }

  const finished = passed + failed + errors
  return {
    total: items.length,
    finished,
    passed,
    failed,
    errors,
    passRate: finished > 0 ? passed / finished : null,
    meanScore:
      scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null,
    latencyP50: percentile(latencies, 50),
    latencyP95: percentile(latencies, 95),
    inputTokens,
    outputTokens,
    kgCo2eq: co2Measured ? co2 : null,
  }
}

/** One side of a comparison: the item of a (campaign, target) for a row. */
export interface SeriesItem {
  rowId: string
  input: string
  answer: string | null
  verdict: JudgeVerdict | null
  score: number | null
  latencyMs: number | null
}

export type RowChange = 'improved' | 'regressed' | 'same' | 'only_a' | 'only_b'

export interface ComparedRow {
  rowId: string
  input: string
  a: SeriesItem | null
  b: SeriesItem | null
  change: RowChange
}

export interface Comparison {
  rows: ComparedRow[]
  counts: { improved: number; regressed: number; same: number; onlyA: number; onlyB: number }
}

/**
 * Pairs two series by row: `a` is the reference, `b` what is being compared to it. A row is
 * « improved » when only `b` passes and « regressed » when only `a` does; an error or a missing
 * verdict is not a pass. Rows of `a` come first, in order, then the rows only `b` has.
 */
export function compareSeries(a: readonly SeriesItem[], b: readonly SeriesItem[]): Comparison {
  const byRowB = new Map(b.map((item) => [item.rowId, item]))
  const seen = new Set<string>()
  const rows: ComparedRow[] = []
  const counts = { improved: 0, regressed: 0, same: 0, onlyA: 0, onlyB: 0 }

  for (const left of a) {
    seen.add(left.rowId)
    const right = byRowB.get(left.rowId) ?? null
    let change: RowChange
    if (!right) {
      change = 'only_a'
      counts.onlyA += 1
    } else {
      const leftPass = left.verdict === 'pass'
      const rightPass = right.verdict === 'pass'
      if (!leftPass && rightPass) change = 'improved'
      else if (leftPass && !rightPass) change = 'regressed'
      else change = 'same'
      counts[change] += 1
    }
    rows.push({ rowId: left.rowId, input: left.input, a: left, b: right, change })
  }
  for (const right of b) {
    if (seen.has(right.rowId)) continue
    counts.onlyB += 1
    rows.push({ rowId: right.rowId, input: right.input, a: null, b: right, change: 'only_b' })
  }
  return { rows, counts }
}

/**
 * How often a judge agrees with human verdicts. A judge that could not decide (`error`) does not
 * agree. `rate` is `null` without any annotation.
 */
export function agreement(pairs: readonly { judge: JudgeVerdict; human: 'pass' | 'fail' }[]): {
  total: number
  matched: number
  rate: number | null
} {
  const matched = pairs.filter((pair) => pair.judge === pair.human).length
  return { total: pairs.length, matched, rate: pairs.length > 0 ? matched / pairs.length : null }
}
