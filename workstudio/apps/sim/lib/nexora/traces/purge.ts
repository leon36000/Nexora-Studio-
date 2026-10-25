import { db } from '@sim/db'
import { nexoraAssistantConversation, nexoraTrace } from '@sim/db/schema'
import { and, eq, inArray, lt, type SQL } from 'drizzle-orm'
import { tryAcquireAdvisoryXactLock } from '@/lib/db/advisory-locks'
import type { TraceSettings } from '@/lib/nexora/traces/settings'

const DAY_MS = 86_400_000
const DEFAULT_BATCH_SIZE = 5000
const LOCK_TAG = 'nexora_trace_purge'

function cutoff(now: Date, retentionDays: number): Date {
  return new Date(now.getTime() - retentionDays * DAY_MS)
}

/**
 * Deletes batches of rows until a batch comes back short, each batch in its own transaction under
 * a non-waiting advisory lock: a second purge arriving meanwhile leaves the work to the first
 * instead of fighting it, and the next scheduled run finishes whatever remains.
 */
async function deleteInBatches(
  lockKey: string,
  batchSize: number,
  deleteBatch: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<number>
): Promise<number> {
  let total = 0
  for (;;) {
    const deleted = await db.transaction(async (tx) => {
      if (!(await tryAcquireAdvisoryXactLock(tx, LOCK_TAG, lockKey))) return null
      return deleteBatch(tx)
    })
    if (deleted === null) return total
    total += deleted
    if (deleted < batchSize) return total
  }
}

/**
 * Deletes the traces that started more than `retentionDays` before `now` (a trace exactly at the
 * limit stays), with their spans, optionally those of one workspace only. `now` is a parameter so
 * a test plays another clock.
 */
export async function purgeTraces({
  now,
  retentionDays,
  workspaceId,
  batchSize = DEFAULT_BATCH_SIZE,
}: {
  now: Date
  retentionDays: number
  workspaceId?: string
  batchSize?: number
}): Promise<{ deleted: number }> {
  const limit = cutoff(now, retentionDays)
  const where: SQL | undefined = workspaceId
    ? and(lt(nexoraTrace.startedAt, limit), eq(nexoraTrace.workspaceId, workspaceId))
    : lt(nexoraTrace.startedAt, limit)
  const deleted = await deleteInBatches('traces', batchSize, async (tx) => {
    const rows = await tx
      .select({ id: nexoraTrace.id })
      .from(nexoraTrace)
      .where(where)
      .orderBy(nexoraTrace.startedAt)
      .limit(batchSize)
    if (rows.length === 0) return 0
    await tx.delete(nexoraTrace).where(
      inArray(
        nexoraTrace.id,
        rows.map((row) => row.id)
      )
    )
    return rows.length
  })
  return { deleted }
}

/** Deletes the Assistant conversations whose last message is more than `retentionDays` old. */
export async function purgeConversations({
  now,
  retentionDays,
  batchSize = DEFAULT_BATCH_SIZE,
}: {
  now: Date
  retentionDays: number
  batchSize?: number
}): Promise<{ deleted: number }> {
  const limit = cutoff(now, retentionDays)
  const deleted = await deleteInBatches('conversations', batchSize, async (tx) => {
    const rows = await tx
      .select({ id: nexoraAssistantConversation.id })
      .from(nexoraAssistantConversation)
      .where(lt(nexoraAssistantConversation.updatedAt, limit))
      .orderBy(nexoraAssistantConversation.updatedAt)
      .limit(batchSize)
    if (rows.length === 0) return 0
    await tx.delete(nexoraAssistantConversation).where(
      inArray(
        nexoraAssistantConversation.id,
        rows.map((row) => row.id)
      )
    )
    return rows.length
  })
  return { deleted }
}

export interface PurgeSummary {
  deletedTraces: number
  deletedConversations: number
  retentionDays: number
}

/**
 * The scheduled purge: traces older than the retention, and Assistant conversations when the
 * administrator set a retention for them (none by default: nobody's history is deleted unasked).
 * Retention applies to what is stored even when capturing new traces is switched off.
 */
export async function runScheduledPurge(now: Date, settings: TraceSettings): Promise<PurgeSummary> {
  const traces = await purgeTraces({ now, retentionDays: settings.retentionDays })
  const conversations =
    settings.conversationRetentionDays === null
      ? { deleted: 0 }
      : await purgeConversations({ now, retentionDays: settings.conversationRetentionDays })
  return {
    deletedTraces: traces.deleted,
    deletedConversations: conversations.deleted,
    retentionDays: settings.retentionDays,
  }
}
