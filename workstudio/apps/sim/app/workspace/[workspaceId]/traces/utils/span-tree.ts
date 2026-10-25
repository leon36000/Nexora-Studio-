import type { NexoraTraceSpan } from '@/lib/api/contracts/nexora-traces'

export interface SpanRow {
  span: NexoraTraceSpan
  depth: number
}

/**
 * The spans of a trace as the tree the screen draws: each parent followed by its children in
 * recorded order, with their depth. A span whose parent is missing is a root; spans caught in a
 * parent cycle are left out rather than looped on.
 */
export function flattenSpanTree(spans: readonly NexoraTraceSpan[]): SpanRow[] {
  const ids = new Set(spans.map((span) => span.id))
  const children = new Map<string | null, NexoraTraceSpan[]>()
  for (const span of [...spans].sort((a, b) => a.position - b.position)) {
    const key = span.parentId && ids.has(span.parentId) ? span.parentId : null
    const siblings = children.get(key)
    if (siblings) siblings.push(span)
    else children.set(key, [span])
  }
  const rows: SpanRow[] = []
  const walk = (parent: string | null, depth: number) => {
    for (const span of children.get(parent) ?? []) {
      rows.push({ span, depth })
      walk(span.id, depth + 1)
    }
  }
  walk(null, 0)
  return rows
}

function number(value: number, locale: string, digits: number): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

/** « 850 ms », « 12,4 s », « 2 min 5 s ». */
export function formatDuration(ms: number, locale: string): string {
  if (ms < 1000) return `${Math.round(ms)} ms`
  if (ms < 59_950) return `${number(ms / 1000, locale, 1)} s`
  const seconds = Math.round(ms / 1000)
  return `${Math.floor(seconds / 60)} min ${seconds % 60} s`
}

/** The footprint in grams, or kilograms from one kilogram up; « — » when no model was measured. */
export function formatCo2(kgCo2eq: number | null, locale: string): string {
  if (kgCo2eq === null) return '—'
  if (kgCo2eq >= 1) return `${number(kgCo2eq, locale, 1)} kg`
  const grams = kgCo2eq * 1000
  return `${number(grams, locale, grams >= 0.01 ? 2 : 4)} g`
}

/** The « duration over » choices of the filter, in milliseconds. */
export const DURATION_CHOICES = ['1000', '5000', '10000', '30000'] as const

export function durationFilterMs(choice: string): number | undefined {
  return (DURATION_CHOICES as readonly string[]).includes(choice) ? Number(choice) : undefined
}

export const PERIOD_CHOICES = ['1h', '24h', '7d', '30d'] as const
const PERIOD_MS: Record<(typeof PERIOD_CHOICES)[number], number> = {
  '1h': 3_600_000,
  '24h': 86_400_000,
  '7d': 7 * 86_400_000,
  '30d': 30 * 86_400_000,
}

/** The ISO start of a period choice counted back from `now`; none for « all ». */
export function periodStart(choice: string, now: Date): string | undefined {
  const length = PERIOD_MS[choice as keyof typeof PERIOD_MS]
  return length === undefined ? undefined : new Date(now.getTime() - length).toISOString()
}
