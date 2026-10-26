import { db } from '@sim/db'
import { nexoraBatch, nexoraBatchFile, nexoraBatchItem } from '@sim/db/schema'
import { generateId, generateShortId } from '@sim/utils/id'
import { isRecordLike, toRecord, toRecordOrNull } from '@sim/utils/object'
import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lt,
  notInArray,
  or,
  type SQL,
  sql,
} from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import {
  type BatchProblem,
  type BatchSource,
  type BatchStatus,
  MAX_ITEM_ATTEMPTS,
} from '@/lib/nexora/batches/types'

const INSERT_CHUNK = 500
const OPEN_STATUSES: BatchStatus[] = ['in_progress', 'cancelling']

/**
 * Whose files and batches a call may see: a workspace's, or those of the instance keys (`null`).
 * A call made with an API key also names it (`apiKeyId`) and then sees only what that key created;
 * the website, which has no key, sees the whole workspace.
 */
export interface BatchScope {
  workspaceId: string | null
  apiKeyId?: string
}

interface ScopedColumns {
  workspaceId: AnyPgColumn
  apiKeyId: AnyPgColumn
}

function workspaceIs(columns: ScopedColumns, scope: BatchScope): SQL {
  return scope.workspaceId === null
    ? isNull(columns.workspaceId)
    : eq(columns.workspaceId, scope.workspaceId)
}

function scopeIs(columns: ScopedColumns, scope: BatchScope): SQL | undefined {
  const workspace = workspaceIs(columns, scope)
  return scope.apiKeyId === undefined
    ? workspace
    : and(workspace, eq(columns.apiKeyId, scope.apiKeyId))
}

export function newBatchId(): string {
  return `batch_${generateShortId(24)}`
}

export function newFileId(): string {
  return `file-${generateShortId(24)}`
}

export interface FileRecord {
  id: string
  workspaceId: string | null
  apiKeyId: string | null
  purpose: 'batch' | 'batch_output'
  outputKind: 'output' | 'error' | null
  batchId: string | null
  filename: string
  bytes: number
  lineCount: number
  createdAt: Date
}

const fileColumns = {
  id: nexoraBatchFile.id,
  workspaceId: nexoraBatchFile.workspaceId,
  apiKeyId: nexoraBatchFile.apiKeyId,
  purpose: nexoraBatchFile.purpose,
  outputKind: nexoraBatchFile.outputKind,
  batchId: nexoraBatchFile.batchId,
  filename: nexoraBatchFile.filename,
  bytes: nexoraBatchFile.bytes,
  lineCount: nexoraBatchFile.lineCount,
  createdAt: nexoraBatchFile.createdAt,
}

function toFile(row: {
  id: string
  workspaceId: string | null
  apiKeyId: string | null
  purpose: string
  outputKind: string | null
  batchId: string | null
  filename: string
  bytes: number
  lineCount: number
  createdAt: Date
}): FileRecord {
  return {
    ...row,
    purpose: row.purpose === 'batch_output' ? 'batch_output' : 'batch',
    outputKind: row.outputKind === 'output' || row.outputKind === 'error' ? row.outputKind : null,
  }
}

export interface BatchRecord {
  id: string
  workspaceId: string | null
  apiKeyId: string | null
  createdBy: string | null
  source: BatchSource
  name: string | null
  endpoint: string
  model: string
  status: BatchStatus
  inputFileId: string | null
  outputFileId: string | null
  errorFileId: string | null
  metadata: Record<string, string> | null
  config: Record<string, unknown> | null
  tableId: string | null
  concurrency: number
  total: number
  completed: number
  failed: number
  promptTokens: number
  completionTokens: number
  errors: { code: string; message: string; line: number | null }[] | null
  leaseOwner: string | null
  leaseUntil: Date | null
  expiresAt: Date
  createdAt: Date
  startedAt: Date | null
  finishedAt: Date | null
  cancelRequestedAt: Date | null
}

type BatchRow = typeof nexoraBatch.$inferSelect

function toBatch(row: BatchRow): BatchRecord {
  const metadata = isRecordLike(row.metadata)
    ? (Object.fromEntries(
        Object.entries(row.metadata).filter(([, value]) => typeof value === 'string')
      ) as Record<string, string>)
    : null
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    apiKeyId: row.apiKeyId,
    createdBy: row.createdBy,
    source: row.source === 'table' ? 'table' : 'api',
    name: row.name,
    endpoint: row.endpoint,
    model: row.model,
    status: row.status as BatchStatus,
    inputFileId: row.inputFileId,
    outputFileId: row.outputFileId,
    errorFileId: row.errorFileId,
    metadata,
    config: toRecordOrNull(row.config),
    tableId: row.tableId,
    concurrency: row.concurrency,
    total: row.total,
    completed: row.completed,
    failed: row.failed,
    promptTokens: row.promptTokens,
    completionTokens: row.completionTokens,
    errors: Array.isArray(row.errors)
      ? (row.errors as { code: string; message: string; line: number | null }[])
      : null,
    leaseOwner: row.leaseOwner,
    leaseUntil: row.leaseUntil,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    cancelRequestedAt: row.cancelRequestedAt,
  }
}

export interface ItemRecord {
  id: string
  batchId: string
  position: number
  customId: string
  request: Record<string, unknown>
  rowRef: string | null
  attempt: number
}

const itemColumns = {
  id: nexoraBatchItem.id,
  batchId: nexoraBatchItem.batchId,
  position: nexoraBatchItem.position,
  customId: nexoraBatchItem.customId,
  request: nexoraBatchItem.request,
  rowRef: nexoraBatchItem.rowRef,
  attempt: nexoraBatchItem.attempt,
}

function toItem(row: {
  id: string
  batchId: string
  position: number
  customId: string
  request: unknown
  rowRef: string | null
  attempt: number
}): ItemRecord {
  return { ...row, request: toRecord(row.request) }
}

export async function insertFile(input: {
  scope: BatchScope
  apiKeyId: string | null
  filename: string
  text: string
  lineCount: number
}): Promise<FileRecord> {
  const [row] = await db
    .insert(nexoraBatchFile)
    .values({
      id: newFileId(),
      workspaceId: input.scope.workspaceId,
      apiKeyId: input.apiKeyId,
      purpose: 'batch',
      filename: input.filename,
      bytes: Buffer.byteLength(input.text, 'utf8'),
      lineCount: input.lineCount,
      content: input.text,
    })
    .returning(fileColumns)
  return toFile(row)
}

export async function getFile(scope: BatchScope, fileId: string): Promise<FileRecord | null> {
  const [row] = await db
    .select(fileColumns)
    .from(nexoraBatchFile)
    .where(
      and(
        eq(nexoraBatchFile.id, fileId),
        scopeIs(nexoraBatchFile, scope),
        isNull(nexoraBatchFile.deletedAt)
      )
    )
    .limit(1)
  return row ? toFile(row) : null
}

/** The text of an input file (output and error files have none: they are read from the items). */
export async function getFileText(scope: BatchScope, fileId: string): Promise<string | null> {
  const [row] = await db
    .select({ content: nexoraBatchFile.content })
    .from(nexoraBatchFile)
    .where(
      and(
        eq(nexoraBatchFile.id, fileId),
        scopeIs(nexoraBatchFile, scope),
        isNull(nexoraBatchFile.deletedAt)
      )
    )
    .limit(1)
  return row?.content ?? null
}

export async function listFiles(
  scope: BatchScope,
  options: { purpose?: string; limit: number; after?: string }
): Promise<{ files: FileRecord[]; hasMore: boolean }> {
  const anchor = options.after
    ? await db
        .select({ createdAt: nexoraBatchFile.createdAt })
        .from(nexoraBatchFile)
        .where(and(eq(nexoraBatchFile.id, options.after), scopeIs(nexoraBatchFile, scope)))
        .limit(1)
    : []
  const rows = await db
    .select(fileColumns)
    .from(nexoraBatchFile)
    .where(
      and(
        scopeIs(nexoraBatchFile, scope),
        isNull(nexoraBatchFile.deletedAt),
        options.purpose ? eq(nexoraBatchFile.purpose, options.purpose) : undefined,
        anchor[0] ? lt(nexoraBatchFile.createdAt, anchor[0].createdAt) : undefined
      )
    )
    .orderBy(desc(nexoraBatchFile.createdAt), desc(nexoraBatchFile.id))
    .limit(options.limit + 1)
  return { files: rows.slice(0, options.limit).map(toFile), hasMore: rows.length > options.limit }
}

/**
 * Bytes of the input files kept for the scope's workspace, every key together: what the storage
 * quota counts. A deleted file no longer counts, so deleting one frees its space.
 */
export async function storedFileBytes(scope: BatchScope): Promise<number> {
  const [row] = await db
    .select({ used: sql<string>`COALESCE(SUM(${nexoraBatchFile.bytes}), 0)` })
    .from(nexoraBatchFile)
    .where(
      and(
        workspaceIs(nexoraBatchFile, scope),
        eq(nexoraBatchFile.purpose, 'batch'),
        isNull(nexoraBatchFile.deletedAt)
      )
    )
  return Number(row?.used ?? 0) || 0
}

/**
 * Deletes a file for the caller, and with it every trace of its content: the text goes at once,
 * the requests and answers of the batches that read it are deleted, and their output and error
 * files are hidden. A batch still running is asked to stop, as it has nothing left to read.
 */
export async function deleteFile(scope: BatchScope, fileId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const now = new Date()
    const updated = await tx
      .update(nexoraBatchFile)
      .set({ deletedAt: now, content: null })
      .where(
        and(
          eq(nexoraBatchFile.id, fileId),
          scopeIs(nexoraBatchFile, scope),
          isNull(nexoraBatchFile.deletedAt)
        )
      )
      .returning({ id: nexoraBatchFile.id })
    if (updated.length === 0) return false

    const readers = await tx
      .select({ id: nexoraBatch.id })
      .from(nexoraBatch)
      .where(eq(nexoraBatch.inputFileId, fileId))
    const batchIds = readers.map((batch) => batch.id)
    if (batchIds.length === 0) return true

    await tx
      .update(nexoraBatch)
      .set({ status: 'cancelling', cancelRequestedAt: now })
      .where(and(inArray(nexoraBatch.id, batchIds), eq(nexoraBatch.status, 'in_progress')))
    await tx.delete(nexoraBatchItem).where(inArray(nexoraBatchItem.batchId, batchIds))
    await tx
      .update(nexoraBatchFile)
      .set({ deletedAt: now, content: null })
      .where(and(inArray(nexoraBatchFile.batchId, batchIds), isNull(nexoraBatchFile.deletedAt)))
    return true
  })
}

export interface NewItem {
  position: number
  customId: string
  request: Record<string, unknown>
  rowRef?: string | null
}

export interface NewBatch {
  scope: BatchScope
  apiKeyId: string | null
  createdBy: string | null
  source: BatchSource
  name?: string | null
  endpoint: string
  model: string
  inputFileId?: string | null
  metadata?: Record<string, string> | null
  config?: Record<string, unknown> | null
  tableId?: string | null
  concurrency: number
  expiresAt: Date
}

/** Creates an `in_progress` batch with all its items in one transaction. */
export async function insertBatchWithItems(
  batch: NewBatch,
  items: readonly NewItem[]
): Promise<BatchRecord> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(nexoraBatch)
      .values({
        id: newBatchId(),
        workspaceId: batch.scope.workspaceId,
        apiKeyId: batch.apiKeyId,
        createdBy: batch.createdBy,
        source: batch.source,
        name: batch.name ?? null,
        endpoint: batch.endpoint,
        model: batch.model,
        inputFileId: batch.inputFileId ?? null,
        metadata: batch.metadata ?? null,
        config: batch.config ?? null,
        tableId: batch.tableId ?? null,
        concurrency: batch.concurrency,
        total: items.length,
        expiresAt: batch.expiresAt,
      })
      .returning()
    for (let start = 0; start < items.length; start += INSERT_CHUNK) {
      await tx.insert(nexoraBatchItem).values(
        items.slice(start, start + INSERT_CHUNK).map((item) => ({
          id: generateId(),
          batchId: row.id,
          position: item.position,
          customId: item.customId,
          request: item.request,
          rowRef: item.rowRef ?? null,
        }))
      )
    }
    return toBatch(row)
  })
}

/** Records a batch whose input file was refused: `failed` from the start, with the reasons. */
export async function insertFailedBatch(
  batch: NewBatch,
  errors: readonly { code: string; message: string; line: number | null }[]
): Promise<BatchRecord> {
  const now = new Date()
  const [row] = await db
    .insert(nexoraBatch)
    .values({
      id: newBatchId(),
      workspaceId: batch.scope.workspaceId,
      apiKeyId: batch.apiKeyId,
      createdBy: batch.createdBy,
      source: batch.source,
      name: batch.name ?? null,
      endpoint: batch.endpoint,
      model: batch.model,
      inputFileId: batch.inputFileId ?? null,
      metadata: batch.metadata ?? null,
      concurrency: batch.concurrency,
      status: 'failed',
      errors: [...errors],
      expiresAt: batch.expiresAt,
      finishedAt: now,
    })
    .returning()
  return toBatch(row)
}

export async function getBatch(scope: BatchScope, batchId: string): Promise<BatchRecord | null> {
  const [row] = await db
    .select()
    .from(nexoraBatch)
    .where(and(eq(nexoraBatch.id, batchId), scopeIs(nexoraBatch, scope)))
    .limit(1)
  return row ? toBatch(row) : null
}

/** A batch by id alone: for the engine, which has no caller. */
export async function getBatchById(batchId: string): Promise<BatchRecord | null> {
  const [row] = await db.select().from(nexoraBatch).where(eq(nexoraBatch.id, batchId)).limit(1)
  return row ? toBatch(row) : null
}

export async function listBatches(
  scope: BatchScope,
  options: { limit: number; after?: string; source?: BatchSource }
): Promise<{ batches: BatchRecord[]; hasMore: boolean }> {
  const anchor = options.after
    ? await db
        .select({ createdAt: nexoraBatch.createdAt })
        .from(nexoraBatch)
        .where(and(eq(nexoraBatch.id, options.after), scopeIs(nexoraBatch, scope)))
        .limit(1)
    : []
  const rows = await db
    .select()
    .from(nexoraBatch)
    .where(
      and(
        scopeIs(nexoraBatch, scope),
        options.source ? eq(nexoraBatch.source, options.source) : undefined,
        anchor[0] ? lt(nexoraBatch.createdAt, anchor[0].createdAt) : undefined
      )
    )
    .orderBy(desc(nexoraBatch.createdAt), desc(nexoraBatch.id))
    .limit(options.limit + 1)
  return {
    batches: rows.slice(0, options.limit).map(toBatch),
    hasMore: rows.length > options.limit,
  }
}

/** Requests still waiting or running in the open batches of the scope's workspace (every key together). */
export async function pendingLinesInScope(scope: BatchScope): Promise<number> {
  const [row] = await db
    .select({
      pending: sql<string>`COALESCE(SUM(${nexoraBatch.total} - ${nexoraBatch.completed} - ${nexoraBatch.failed}), 0)`,
    })
    .from(nexoraBatch)
    .where(and(workspaceIs(nexoraBatch, scope), inArray(nexoraBatch.status, OPEN_STATUSES)))
  return Number(row?.pending ?? 0) || 0
}

/**
 * Asks for a batch to stop. `in_progress` becomes `cancelling` (the process that runs it, or the
 * next one to adopt it, finishes the job); any other status is returned unchanged.
 */
export async function requestCancel(
  scope: BatchScope,
  batchId: string,
  now: Date
): Promise<BatchRecord | null> {
  const [row] = await db
    .update(nexoraBatch)
    .set({ status: 'cancelling', cancelRequestedAt: now })
    .where(
      and(
        eq(nexoraBatch.id, batchId),
        scopeIs(nexoraBatch, scope),
        eq(nexoraBatch.status, 'in_progress')
      )
    )
    .returning()
  return row ? toBatch(row) : getBatch(scope, batchId)
}

/**
 * Becomes the process that runs a batch: possible while nobody holds it or its lease expired (its
 * server stopped). The items that process had in flight go back to the queue, or are given up on
 * after {@link MAX_ITEM_ATTEMPTS} attempts.
 */
export async function acquireBatch(
  batchId: string,
  owner: string,
  now: Date,
  leaseUntil: Date
): Promise<{ batch: BatchRecord; resumed: boolean } | null> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(nexoraBatch)
      .where(eq(nexoraBatch.id, batchId))
      .for('update')
    if (!current || !OPEN_STATUSES.includes(current.status as BatchStatus)) return null
    const held = current.leaseOwner !== null && current.leaseUntil !== null
    if (held && current.leaseUntil !== null && current.leaseUntil >= now) return null
    const resumed = held
    if (resumed) {
      await tx
        .update(nexoraBatchItem)
        .set({
          status: sql`CASE WHEN ${nexoraBatchItem.attempt} >= ${MAX_ITEM_ATTEMPTS} THEN 'error' ELSE 'pending' END`,
          error: sql`CASE WHEN ${nexoraBatchItem.attempt} >= ${MAX_ITEM_ATTEMPTS} THEN '{"code":"interrupted","message":"Interrompu trop souvent : le serveur s’est arrêté pendant cette requête."}'::jsonb ELSE ${nexoraBatchItem.error} END`,
          finishedAt: sql`CASE WHEN ${nexoraBatchItem.attempt} >= ${MAX_ITEM_ATTEMPTS} THEN ${now.toISOString()}::timestamp ELSE NULL END`,
        })
        .where(and(eq(nexoraBatchItem.batchId, batchId), eq(nexoraBatchItem.status, 'running')))
      const [errored] = await tx
        .select({ failed: sql<string>`COUNT(*)` })
        .from(nexoraBatchItem)
        .where(and(eq(nexoraBatchItem.batchId, batchId), eq(nexoraBatchItem.status, 'error')))
      await tx
        .update(nexoraBatch)
        .set({ failed: Number(errored?.failed ?? 0) })
        .where(eq(nexoraBatch.id, batchId))
    }
    const [batch] = await tx
      .update(nexoraBatch)
      .set({ leaseOwner: owner, leaseUntil, startedAt: current.startedAt ?? now })
      .where(eq(nexoraBatch.id, batchId))
      .returning()
    return { batch: toBatch(batch), resumed }
  })
}

/**
 * Extends the lease. Returns the batch's status while this process still owns it (`cancelling`
 * tells it to stop), or `null` once it no longer does.
 */
export async function heartbeat(
  batchId: string,
  owner: string,
  leaseUntil: Date
): Promise<BatchStatus | null> {
  const [row] = await db
    .update(nexoraBatch)
    .set({ leaseUntil })
    .where(
      and(
        eq(nexoraBatch.id, batchId),
        eq(nexoraBatch.leaseOwner, owner),
        inArray(nexoraBatch.status, OPEN_STATUSES)
      )
    )
    .returning({ status: nexoraBatch.status })
  return row ? (row.status as BatchStatus) : null
}

export async function readBatchStatus(batchId: string): Promise<BatchStatus | null> {
  const [row] = await db
    .select({ status: nexoraBatch.status })
    .from(nexoraBatch)
    .where(eq(nexoraBatch.id, batchId))
  return row ? (row.status as BatchStatus) : null
}

/** Takes the next waiting item (lowest position) for this process; `null` when none is left. */
export async function claimNextItem(batchId: string, now: Date): Promise<ItemRecord | null> {
  return db.transaction(async (tx) => {
    const [next] = await tx
      .select({ id: nexoraBatchItem.id })
      .from(nexoraBatchItem)
      .where(and(eq(nexoraBatchItem.batchId, batchId), eq(nexoraBatchItem.status, 'pending')))
      .orderBy(asc(nexoraBatchItem.position))
      .limit(1)
      .for('update', { skipLocked: true })
    if (!next) return null
    const [claimed] = await tx
      .update(nexoraBatchItem)
      .set({ status: 'running', attempt: sql`${nexoraBatchItem.attempt} + 1`, startedAt: now })
      .where(eq(nexoraBatchItem.id, next.id))
      .returning(itemColumns)
    return toItem(claimed)
  })
}

export interface ItemSuccess {
  response: { status_code: number; request_id: string; body: unknown } | null
  answer: string | null
  promptTokens: number
  completionTokens: number
  latencyMs: number | null
}

/** Records an answered item and counts it in its batch. Only an item still running is written. */
export async function completeItem(
  itemId: string,
  result: ItemSuccess,
  now: Date
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [item] = await tx
      .update(nexoraBatchItem)
      .set({
        status: 'done',
        response: result.response,
        answer: result.answer,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        latencyMs: result.latencyMs,
        error: null,
        finishedAt: now,
      })
      .where(and(eq(nexoraBatchItem.id, itemId), eq(nexoraBatchItem.status, 'running')))
      .returning({ batchId: nexoraBatchItem.batchId })
    if (!item) return false
    await tx
      .update(nexoraBatch)
      .set({
        completed: sql`${nexoraBatch.completed} + 1`,
        promptTokens: sql`${nexoraBatch.promptTokens} + ${result.promptTokens}`,
        completionTokens: sql`${nexoraBatch.completionTokens} + ${result.completionTokens}`,
      })
      .where(eq(nexoraBatch.id, item.batchId))
    return true
  })
}

/** Records a request that failed for good and counts it in its batch. */
export async function failItem(
  itemId: string,
  error: BatchProblem,
  response: ItemSuccess['response'],
  latencyMs: number | null,
  now: Date
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [item] = await tx
      .update(nexoraBatchItem)
      .set({ status: 'error', error, response, latencyMs, finishedAt: now })
      .where(and(eq(nexoraBatchItem.id, itemId), eq(nexoraBatchItem.status, 'running')))
      .returning({ batchId: nexoraBatchItem.batchId })
    if (!item) return false
    await tx
      .update(nexoraBatch)
      .set({ failed: sql`${nexoraBatch.failed} + 1` })
      .where(eq(nexoraBatch.id, item.batchId))
    return true
  })
}

/** Puts a running item back in the queue; `attempted` says whether the try counts as one. */
export async function releaseItem(itemId: string, attempted = false): Promise<void> {
  await db
    .update(nexoraBatchItem)
    .set({
      status: 'pending',
      attempt: attempted
        ? nexoraBatchItem.attempt
        : sql`GREATEST(${nexoraBatchItem.attempt} - 1, 0)`,
    })
    .where(and(eq(nexoraBatchItem.id, itemId), eq(nexoraBatchItem.status, 'running')))
}

export async function countOpenItems(batchId: string): Promise<number> {
  const [row] = await db
    .select({ open: sql<string>`COUNT(*)` })
    .from(nexoraBatchItem)
    .where(
      and(
        eq(nexoraBatchItem.batchId, batchId),
        inArray(nexoraBatchItem.status, ['pending', 'running'])
      )
    )
  return Number(row?.open ?? 0) || 0
}

export type BatchOutcome = 'completed' | 'cancelled' | 'expired' | 'failed'

const OPEN_ITEM_PROBLEM: Record<Exclude<BatchOutcome, 'completed'>, BatchProblem> = {
  cancelled: {
    code: 'batch_cancelled',
    message: 'Le lot a été annulé avant l’exécution de cette requête.',
  },
  expired: {
    code: 'batch_expired',
    message: 'Le lot a expiré avant l’exécution de cette requête.',
  },
  failed: {
    code: 'batch_failed',
    message: 'Le lot a été arrêté avant l’exécution de cette requête.',
  },
}

/**
 * Ends a batch this process runs, in one transaction: the requests still open become errors
 * (`batch_cancelled`, `batch_expired`), and a batch created through the API gets its output file
 * (answered requests) and its error file (failed ones). `false` when the process no longer owns it.
 */
export async function finishBatch(
  batchId: string,
  owner: string,
  outcome: BatchOutcome,
  now: Date,
  errors?: { code: string; message: string; line: number | null }[]
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(nexoraBatch)
      .where(
        and(
          eq(nexoraBatch.id, batchId),
          eq(nexoraBatch.leaseOwner, owner),
          inArray(nexoraBatch.status, OPEN_STATUSES)
        )
      )
      .for('update')
    if (!current) return false
    if (outcome !== 'completed') {
      await tx
        .update(nexoraBatchItem)
        .set({ status: 'error', error: OPEN_ITEM_PROBLEM[outcome], finishedAt: now })
        .where(
          and(
            eq(nexoraBatchItem.batchId, batchId),
            inArray(nexoraBatchItem.status, ['pending', 'running'])
          )
        )
    }
    const [counts] = await tx
      .select({
        completed: sql<string>`COUNT(*) FILTER (WHERE ${nexoraBatchItem.status} = 'done')`,
        failed: sql<string>`COUNT(*) FILTER (WHERE ${nexoraBatchItem.status} = 'error')`,
      })
      .from(nexoraBatchItem)
      .where(eq(nexoraBatchItem.batchId, batchId))
    const completed = Number(counts?.completed ?? 0)
    const failed = Number(counts?.failed ?? 0)

    let outputFileId: string | null = null
    let errorFileId: string | null = null
    if (current.source === 'api') {
      const makeFile = async (kind: 'output' | 'error', lineCount: number) => {
        if (lineCount === 0) return null
        const id = newFileId()
        await tx.insert(nexoraBatchFile).values({
          id,
          workspaceId: current.workspaceId,
          apiKeyId: current.apiKeyId,
          purpose: 'batch_output',
          outputKind: kind,
          batchId,
          filename: `${batchId}_${kind}.jsonl`,
          lineCount,
        })
        return id
      }
      outputFileId = await makeFile('output', completed)
      errorFileId = await makeFile('error', failed)
    }
    await tx
      .update(nexoraBatch)
      .set({
        status: outcome,
        completed,
        failed,
        outputFileId,
        errorFileId,
        errors: errors ?? null,
        finishedAt: now,
        leaseOwner: null,
        leaseUntil: null,
      })
      .where(eq(nexoraBatch.id, batchId))
    return true
  })
}

/** Batches nobody runs: never started, lease expired, or asked to cancel. */
export async function listAdoptableBatchIds(now: Date): Promise<string[]> {
  const rows = await db
    .select({ id: nexoraBatch.id })
    .from(nexoraBatch)
    .where(
      and(
        inArray(nexoraBatch.status, OPEN_STATUSES),
        or(isNull(nexoraBatch.leaseUntil), lt(nexoraBatch.leaseUntil, now))
      )
    )
    .orderBy(asc(nexoraBatch.createdAt))
    .limit(50)
  return rows.map((row) => row.id)
}

export interface ResultRow {
  id: string
  position: number
  customId: string
  rowRef: string | null
  status: string
  response: { status_code: number; request_id: string; body: unknown } | null
  answer: string | null
  error: BatchProblem | null
  latencyMs: number | null
  /** The text a table batch sent for this row (`request.input`); `null` for an API batch. */
  inputText: string | null
}

function toProblem(value: unknown): BatchProblem | null {
  if (!isRecordLike(value) || typeof value.code !== 'string' || typeof value.message !== 'string') {
    return null
  }
  return {
    code: value.code,
    message: value.message,
    ...(typeof value.status === 'number' ? { status: value.status } : {}),
  }
}

function toResult(row: {
  id: string
  position: number
  customId: string
  rowRef: string | null
  status: string
  response: unknown
  answer: string | null
  error: unknown
  latencyMs: number | null
  inputText: string | null
}): ResultRow {
  return {
    ...row,
    response: isRecordLike(row.response) ? (row.response as ResultRow['response']) : null,
    error: toProblem(row.error),
  }
}

const resultColumns = {
  id: nexoraBatchItem.id,
  position: nexoraBatchItem.position,
  customId: nexoraBatchItem.customId,
  rowRef: nexoraBatchItem.rowRef,
  status: nexoraBatchItem.status,
  response: nexoraBatchItem.response,
  answer: nexoraBatchItem.answer,
  error: nexoraBatchItem.error,
  latencyMs: nexoraBatchItem.latencyMs,
  inputText: sql<string | null>`${nexoraBatchItem.request}->>'input'`,
}

/** A page of a batch's results after `afterPosition`: `output` (answered), `error` (failed) or `all`. */
export async function listResults(
  batchId: string,
  kind: 'output' | 'error' | 'all',
  afterPosition: number,
  limit: number
): Promise<ResultRow[]> {
  const rows = await db
    .select(resultColumns)
    .from(nexoraBatchItem)
    .where(
      and(
        eq(nexoraBatchItem.batchId, batchId),
        gt(nexoraBatchItem.position, afterPosition),
        kind === 'output'
          ? eq(nexoraBatchItem.status, 'done')
          : kind === 'error'
            ? eq(nexoraBatchItem.status, 'error')
            : undefined
      )
    )
    .orderBy(asc(nexoraBatchItem.position))
    .limit(limit)
  return rows.map(toResult)
}

/** The output or error file's batch, for the scope: how a file id leads to its results. */
export async function getResultFileBatch(
  scope: BatchScope,
  fileId: string
): Promise<{ batchId: string; kind: 'output' | 'error' } | null> {
  const file = await getFile(scope, fileId)
  if (!file?.batchId || !file.outputKind) return null
  return { batchId: file.batchId, kind: file.outputKind }
}

export async function deleteBatch(scope: BatchScope, batchId: string): Promise<boolean> {
  const deleted = await db
    .delete(nexoraBatch)
    .where(
      and(
        eq(nexoraBatch.id, batchId),
        scopeIs(nexoraBatch, scope),
        notInArray(nexoraBatch.status, OPEN_STATUSES),
        isNotNull(nexoraBatch.finishedAt)
      )
    )
    .returning({ id: nexoraBatch.id })
  if (deleted.length === 0) return false
  await db.delete(nexoraBatchFile).where(eq(nexoraBatchFile.batchId, batchId))
  return true
}

/**
 * Removes the batches that ended before `cutoff` (their items go with them) and the files created
 * before it that no open batch reads. Returns how many batches and files went.
 */
export async function purgeBefore(cutoff: Date): Promise<{ batches: number; files: number }> {
  const batches = await db
    .delete(nexoraBatch)
    .where(
      and(
        notInArray(nexoraBatch.status, OPEN_STATUSES),
        isNotNull(nexoraBatch.finishedAt),
        lt(nexoraBatch.finishedAt, cutoff)
      )
    )
    .returning({ id: nexoraBatch.id })
  const files = await db
    .delete(nexoraBatchFile)
    .where(
      and(
        lt(nexoraBatchFile.createdAt, cutoff),
        sql`NOT EXISTS (SELECT 1 FROM ${nexoraBatch} WHERE ${nexoraBatch.inputFileId} = ${nexoraBatchFile.id} AND ${nexoraBatch.status} IN ('in_progress', 'cancelling'))`
      )
    )
    .returning({ id: nexoraBatchFile.id })
  return { batches: batches.length, files: files.length }
}
