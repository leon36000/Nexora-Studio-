import type { nexoraTrace, nexoraTraceSpan } from '@sim/db/schema'

export type StoredTraceRow = typeof nexoraTrace.$inferInsert
export type StoredSpanRow = typeof nexoraTraceSpan.$inferInsert

/** A trace as it is written to PostgreSQL (masked, capped) and handed to the OTLP export. */
export interface StoredTrace {
  trace: StoredTraceRow
  spans: StoredSpanRow[]
}
