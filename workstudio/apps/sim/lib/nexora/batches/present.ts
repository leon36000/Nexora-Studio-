import type { NexoraBatch, NexoraBatchResult } from '@/lib/api/contracts/nexora-batches'
import { answerOf } from '@/lib/nexora/batches/csv'
import type { BatchRecord, ResultRow } from '@/lib/nexora/batches/repository'

/** A batch as the screen shows it (the table batch's column and skipped rows come from its config). */
export function presentBatch(batch: BatchRecord): NexoraBatch {
  const outputColumnName =
    typeof batch.config?.outputColumnName === 'string' ? batch.config.outputColumnName : null
  const skipped = typeof batch.config?.skipped === 'number' ? batch.config.skipped : 0
  return {
    id: batch.id,
    name: batch.name,
    source: batch.source,
    model: batch.model,
    status: batch.status,
    tableId: batch.tableId,
    outputColumnName,
    concurrency: batch.concurrency,
    total: batch.total,
    completed: batch.completed,
    failed: batch.failed,
    skipped,
    promptTokens: batch.promptTokens,
    completionTokens: batch.completionTokens,
    errors: batch.errors?.map(({ code, message }) => ({ code, message })) ?? null,
    createdAt: batch.createdAt.toISOString(),
    startedAt: batch.startedAt?.toISOString() ?? null,
    finishedAt: batch.finishedAt?.toISOString() ?? null,
    expiresAt: batch.expiresAt.toISOString(),
  }
}

const RESULT_STATUSES = ['pending', 'running', 'done', 'error'] as const

export function presentResult(row: ResultRow): NexoraBatchResult {
  return {
    position: row.position,
    customId: row.customId,
    input: row.inputText,
    answer: answerOf(row),
    status: RESULT_STATUSES.find((status) => status === row.status) ?? 'pending',
    error: row.error?.message ?? null,
    latencyMs: row.latencyMs,
  }
}
