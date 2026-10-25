import type { NexoraTraceSpan, NexoraTraceSummary } from '@/lib/api/contracts/nexora-traces'
import type { SpanRow, TraceFilters, TraceSummaryRow } from '@/lib/nexora/traces/repository'

export function presentTrace(trace: TraceSummaryRow): NexoraTraceSummary {
  return {
    ...trace,
    visibility: trace.visibility === 'private' ? 'private' : 'workspace',
    status: trace.status === 'error' ? 'error' : 'ok',
    startedAt: trace.startedAt.toISOString(),
  }
}

export function presentSpan(span: SpanRow): NexoraTraceSpan {
  return {
    ...span,
    kind: span.kind as NexoraTraceSpan['kind'],
    status: span.status === 'error' ? 'error' : 'ok',
    startedAt: span.startedAt.toISOString(),
  }
}

type TraceListQuery = Omit<TraceFilters, 'workspaceId' | 'from' | 'to'> & {
  from?: string
  to?: string
}

/** A list query as the repository's filters: the dates parsed. */
export function toFilters({ from, to, ...rest }: TraceListQuery): Omit<TraceFilters, 'workspaceId'> {
  return { ...rest, from: from ? new Date(from) : undefined, to: to ? new Date(to) : undefined }
}
