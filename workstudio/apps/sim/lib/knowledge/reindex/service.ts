import { recordAuditOnce } from '@sim/audit'
import { db } from '@sim/db'
import {
  document,
  embedding,
  knowledgeBase,
  knowledgeReindex,
  knowledgeReindexVector,
} from '@sim/db/schema'
import { createLogger } from '@sim/logger'
import { getErrorMessage, getPostgresErrorCode } from '@sim/utils/errors'
import { generateId } from '@sim/utils/id'
import { truncate } from '@sim/utils/string'
import { and, asc, count, eq, gt, isNull, ne, notExists, or, type SQL, sql } from 'drizzle-orm'
import { OrchestrationError } from '@/lib/core/orchestration/types'
import { enqueueOutboxEvent } from '@/lib/core/outbox/service'
import {
  type KbEmbeddingDimensions,
  toKbEmbeddingDimensions,
} from '@/lib/knowledge/embedding-models'
import { generateEmbeddings } from '@/lib/knowledge/embeddings'
import {
  knowledgeReindexCompletedAudit,
  knowledgeReindexFailedAudit,
} from '@/lib/knowledge/reindex/audit'
import type { KnowledgeReindexErrorCode } from '@/lib/knowledge/reindex/failure'
import { isSameEmbeddingModel } from '@/lib/knowledge/reindex/model-name'
import { KNOWLEDGE_REINDEX_EVENT } from '@/lib/knowledge/reindex/outbox-event'
import { embeddingVectorAssignments } from '@/lib/knowledge/vector-columns'

const logger = createLogger('KnowledgeReindex')

/** A running reindex whose row has not moved for this long has lost its worker; it may be restarted. */
const STALL_AFTER_MS = 20 * 60 * 1000
/** Chunks embedded per request; a local model on a CPU answers a batch well within a minute. */
const EMBED_BATCH_SIZE = 32
/** Time one batch may take: a slice starts another only when this much is left. */
const EMBED_BATCH_BUDGET_MS = 90_000
const DOCUMENT_PAGE_SIZE = 100
/** Chunks written while a slice runs are embedded before a new switch attempt, a few times at most. */
const MAX_SWITCH_ATTEMPTS_PER_SLICE = 5
const SWITCH_LOCK_TIMEOUT = '10000ms'
const MAX_STORED_ERROR_LENGTH = 500

type KnowledgeReindexStatus = 'running' | 'completed' | 'failed'

export interface KnowledgeReindexState {
  status: KnowledgeReindexStatus
  generation: string
  sourceModel: string
  sourceDimension: number
  targetModel: string
  targetDimension: number
  totalChunks: number
  embeddedChunks: number
  errorCode: KnowledgeReindexErrorCode | null
  error: string | null
  startedAt: Date
  updatedAt: Date
  completedAt: Date | null
  /** Running, but no worker has moved it for a while; starting again is allowed. */
  stalled: boolean
}

/** Another reindex of the base is still running. */
export class KnowledgeReindexConflictError extends OrchestrationError {
  constructor() {
    super('conflict', 'A reindex of this knowledge base is already running')
    this.name = 'KnowledgeReindexConflictError'
  }
}

function isStalled(status: string, updatedAt: Date, now = Date.now()): boolean {
  return status === 'running' && now - updatedAt.getTime() > STALL_AFTER_MS
}

export async function readKnowledgeReindexState(
  knowledgeBaseId: string
): Promise<KnowledgeReindexState | null> {
  const [row] = await db
    .select({
      status: knowledgeReindex.status,
      generation: knowledgeReindex.generation,
      sourceModel: knowledgeReindex.sourceModel,
      sourceDimension: knowledgeReindex.sourceDimension,
      targetModel: knowledgeReindex.targetModel,
      targetDimension: knowledgeReindex.targetDimension,
      totalChunks: knowledgeReindex.totalChunks,
      embeddedChunks: knowledgeReindex.embeddedChunks,
      errorCode: knowledgeReindex.errorCode,
      error: knowledgeReindex.error,
      startedAt: knowledgeReindex.startedAt,
      updatedAt: knowledgeReindex.updatedAt,
      completedAt: knowledgeReindex.completedAt,
    })
    .from(knowledgeReindex)
    .where(eq(knowledgeReindex.knowledgeBaseId, knowledgeBaseId))
    .limit(1)
  if (!row) return null
  return {
    ...row,
    status: row.status as KnowledgeReindexStatus,
    errorCode: row.errorCode as KnowledgeReindexErrorCode | null,
    stalled: isStalled(row.status, row.updatedAt),
  }
}

export interface KnowledgeReindexView {
  embeddingModel: string
  embeddingDimension: number
  documentCount: number
  chunkCount: number
  reindex: KnowledgeReindexState | null
}

/** The base's model, what a reindex would cover, and its latest reindex. */
export async function readKnowledgeReindexView(
  knowledgeBaseId: string
): Promise<KnowledgeReindexView> {
  const [[base], [documents], [chunks], reindex] = await Promise.all([
    db
      .select({
        embeddingModel: knowledgeBase.embeddingModel,
        embeddingDimension: knowledgeBase.embeddingDimension,
      })
      .from(knowledgeBase)
      .where(eq(knowledgeBase.id, knowledgeBaseId))
      .limit(1),
    db
      .select({ total: count() })
      .from(document)
      .where(
        and(
          eq(document.knowledgeBaseId, knowledgeBaseId),
          isNull(document.deletedAt),
          isNull(document.archivedAt)
        )
      ),
    db
      .select({ total: count() })
      .from(embedding)
      .where(eq(embedding.knowledgeBaseId, knowledgeBaseId)),
    readKnowledgeReindexState(knowledgeBaseId),
  ])
  if (!base) throw new OrchestrationError('not_found', 'Knowledge base not found')
  return {
    ...base,
    documentCount: documents?.total ?? 0,
    chunkCount: chunks?.total ?? 0,
    reindex,
  }
}

/**
 * Starts re-embedding a base with `target`, in one transaction with the event that drives it.
 * The base itself does not change until the switch. Refuses the model the base already uses and a
 * second reindex while one runs (a stalled one may be replaced). Vectors an earlier attempt
 * computed with the same model are kept and count toward this one (a chunk whose text changed
 * since is embedded again); those of another model are discarded.
 */
export async function startKnowledgeReindex(input: {
  knowledgeBaseId: string
  target: { model: string; dimensions: number }
  requestedBy: string
}): Promise<{ generation: string; eventId: string }> {
  const targetDimension = toKbEmbeddingDimensions(input.target.dimensions)
  return db.transaction(async (tx) => {
    const [base] = await tx
      .select({
        model: knowledgeBase.embeddingModel,
        dimensions: knowledgeBase.embeddingDimension,
        deletedAt: knowledgeBase.deletedAt,
        isSearchIndex: knowledgeBase.isSearchIndex,
      })
      .from(knowledgeBase)
      .where(eq(knowledgeBase.id, input.knowledgeBaseId))
      .for('update')
    if (!base || base.deletedAt)
      throw new OrchestrationError('not_found', 'Knowledge base not found')
    if (base.isSearchIndex) {
      throw new OrchestrationError('validation', 'A search index cannot be reindexed')
    }
    if (
      isSameEmbeddingModel(base.model, input.target.model) &&
      base.dimensions === targetDimension
    ) {
      throw new OrchestrationError(
        'validation',
        'The knowledge base already uses this embedding model'
      )
    }
    const [current] = await tx
      .select({ status: knowledgeReindex.status, updatedAt: knowledgeReindex.updatedAt })
      .from(knowledgeReindex)
      .where(eq(knowledgeReindex.knowledgeBaseId, input.knowledgeBaseId))
      .for('update')
    if (current?.status === 'running' && !isStalled(current.status, current.updatedAt)) {
      throw new KnowledgeReindexConflictError()
    }

    await tx
      .delete(knowledgeReindexVector)
      .where(
        and(
          eq(knowledgeReindexVector.knowledgeBaseId, input.knowledgeBaseId),
          or(
            isNull(knowledgeReindexVector.targetModel),
            ne(knowledgeReindexVector.targetModel, input.target.model),
            sql`array_length(${knowledgeReindexVector.vector}, 1) <> ${targetDimension}`
          )
        )
      )
    const [{ total }] = await tx
      .select({ total: count() })
      .from(embedding)
      .where(eq(embedding.knowledgeBaseId, input.knowledgeBaseId))
    const generation = generateId()
    await tx
      .update(knowledgeReindexVector)
      .set({ generation })
      .where(eq(knowledgeReindexVector.knowledgeBaseId, input.knowledgeBaseId))
    const now = new Date()
    const state = {
      generation,
      status: 'running',
      sourceModel: base.model,
      sourceDimension: base.dimensions,
      targetModel: input.target.model,
      targetDimension,
      totalChunks: total,
      embeddedChunks: 0,
      errorCode: null,
      error: null,
      requestedBy: input.requestedBy,
      startedAt: now,
      updatedAt: now,
      completedAt: null,
    }
    await tx
      .insert(knowledgeReindex)
      .values({ knowledgeBaseId: input.knowledgeBaseId, ...state })
      .onConflictDoUpdate({ target: knowledgeReindex.knowledgeBaseId, set: state })
    const eventId = await enqueueOutboxEvent(
      tx,
      KNOWLEDGE_REINDEX_EVENT,
      { knowledgeBaseId: input.knowledgeBaseId, generation },
      { id: `knowledge-reindex-${generation}`, maxAttempts: 5 }
    )
    logger.info('Knowledge reindex started', {
      knowledgeBaseId: input.knowledgeBaseId,
      generation,
      targetModel: input.target.model,
      totalChunks: total,
    })
    return { generation, eventId }
  })
}

/** Chunks of the base (optionally narrowed) with no vector of this generation for their text. */
function missingVector(knowledgeBaseId: string, generation: string, narrow?: SQL): SQL {
  const conditions = [
    eq(embedding.knowledgeBaseId, knowledgeBaseId),
    notExists(
      db
        .select({ found: sql`1` })
        .from(knowledgeReindexVector)
        .where(
          and(
            eq(knowledgeReindexVector.embeddingId, embedding.id),
            eq(knowledgeReindexVector.generation, generation),
            eq(knowledgeReindexVector.chunkHash, embedding.chunkHash)
          )
        )
    ),
  ]
  if (narrow) conditions.push(narrow)
  return and(...conditions) as SQL
}

interface EmbedContext {
  knowledgeBaseId: string
  generation: string
  workspaceId: string | null
  target: { model: string; dimensions: KbEmbeddingDimensions }
  signal?: AbortSignal
  outOfTime: () => boolean
}

/** Embeds, batch by batch, the chunks still missing a vector; stops when time is short. */
async function embedMissing(context: EmbedContext, narrow?: SQL): Promise<'done' | 'out-of-time'> {
  for (;;) {
    const chunks = await db
      .select({ id: embedding.id, content: embedding.content, chunkHash: embedding.chunkHash })
      .from(embedding)
      .where(missingVector(context.knowledgeBaseId, context.generation, narrow))
      .orderBy(asc(embedding.documentId), asc(embedding.chunkIndex))
      .limit(EMBED_BATCH_SIZE)
    if (chunks.length === 0) return 'done'
    if (context.outOfTime()) return 'out-of-time'
    context.signal?.throwIfAborted()
    const { embeddings } = await generateEmbeddings(
      chunks.map((chunk) => chunk.content),
      context.target,
      context.workspaceId,
      context.signal
    )
    if (embeddings.length !== chunks.length) {
      throw new Error(
        `The embedding model returned ${embeddings.length} vectors for ${chunks.length} chunks`
      )
    }
    context.signal?.throwIfAborted()
    const rows = chunks.map((chunk, index) => ({
      id: chunk.id,
      hash: chunk.chunkHash,
      vector: embeddings[index],
    }))
    /** Joined to `embedding` so a chunk deleted or edited meanwhile is skipped, not written. */
    await db.execute(sql`
      INSERT INTO knowledge_reindex_vector (embedding_id, knowledge_base_id, generation, target_model, chunk_hash, vector)
      SELECT e.id, e.knowledge_base_id, ${context.generation}, ${context.target.model}, v.hash, v.vector
      FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS v(id text, hash text, vector real[])
      JOIN embedding e ON e.id = v.id AND e.chunk_hash = v.hash
      ON CONFLICT (embedding_id) DO UPDATE SET
        generation = EXCLUDED.generation,
        target_model = EXCLUDED.target_model,
        chunk_hash = EXCLUDED.chunk_hash,
        vector = EXCLUDED.vector,
        created_at = now()
    `)
  }
}

async function refreshProgress(knowledgeBaseId: string, generation: string): Promise<void> {
  const [[{ total }], [{ embedded }]] = await Promise.all([
    db
      .select({ total: count() })
      .from(embedding)
      .where(eq(embedding.knowledgeBaseId, knowledgeBaseId)),
    db
      .select({ embedded: count() })
      .from(knowledgeReindexVector)
      .innerJoin(
        embedding,
        and(
          eq(embedding.id, knowledgeReindexVector.embeddingId),
          eq(embedding.chunkHash, knowledgeReindexVector.chunkHash)
        )
      )
      .where(
        and(
          eq(knowledgeReindexVector.knowledgeBaseId, knowledgeBaseId),
          eq(knowledgeReindexVector.generation, generation)
        )
      ),
  ])
  await db
    .update(knowledgeReindex)
    .set({ totalChunks: total, embeddedChunks: Math.min(embedded, total), updatedAt: new Date() })
    .where(
      and(
        eq(knowledgeReindex.knowledgeBaseId, knowledgeBaseId),
        eq(knowledgeReindex.generation, generation),
        eq(knowledgeReindex.status, 'running')
      )
    )
}

type SwitchOutcome = 'completed' | 'incomplete' | 'busy' | 'stale'

/**
 * The atomic switch. Holding the base for update waits for every transaction writing chunk
 * vectors (they key-share lock it, see `lockKnowledgeEmbeddingTarget`) and keeps new ones out
 * until commit; a chunk written meanwhile has no vector yet and sends the run back to embed it.
 * Then the base's model and every chunk's vector change in this one transaction, and the search
 * projection follows through its row triggers.
 */
async function switchToTarget(
  knowledgeBaseId: string,
  generation: string,
  target: { model: string; dimensions: KbEmbeddingDimensions }
): Promise<SwitchOutcome> {
  try {
    const outcome = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('lock_timeout', ${SWITCH_LOCK_TIMEOUT}, true)`)
      const [base] = await tx
        .select({ id: knowledgeBase.id })
        .from(knowledgeBase)
        .where(eq(knowledgeBase.id, knowledgeBaseId))
        .for('update')
      if (!base) return 'stale'
      const [state] = await tx
        .select({ status: knowledgeReindex.status, generation: knowledgeReindex.generation })
        .from(knowledgeReindex)
        .where(eq(knowledgeReindex.knowledgeBaseId, knowledgeBaseId))
        .for('update')
      if (state?.status !== 'running' || state.generation !== generation) return 'stale'
      const [{ missing }] = await tx
        .select({ missing: count() })
        .from(embedding)
        .where(missingVector(knowledgeBaseId, generation))
      if (missing > 0) return 'incomplete'

      const now = new Date()
      await tx
        .update(knowledgeBase)
        .set({
          embeddingModel: target.model,
          embeddingDimension: target.dimensions,
          updatedAt: now,
        })
        .where(eq(knowledgeBase.id, knowledgeBaseId))
      await tx
        .update(embedding)
        .set({
          ...embeddingVectorAssignments(
            target.dimensions,
            sql`${knowledgeReindexVector.vector}::vector(${sql.raw(String(target.dimensions))})`
          ),
          embeddingModel: target.model,
          updatedAt: now,
        })
        .from(knowledgeReindexVector)
        .where(
          and(
            eq(knowledgeReindexVector.embeddingId, embedding.id),
            eq(knowledgeReindexVector.generation, generation),
            eq(embedding.knowledgeBaseId, knowledgeBaseId)
          )
        )
      const [{ total }] = await tx
        .select({ total: count() })
        .from(embedding)
        .where(eq(embedding.knowledgeBaseId, knowledgeBaseId))
      await tx
        .delete(knowledgeReindexVector)
        .where(eq(knowledgeReindexVector.knowledgeBaseId, knowledgeBaseId))
      await tx
        .update(knowledgeReindex)
        .set({
          status: 'completed',
          totalChunks: total,
          embeddedChunks: total,
          errorCode: null,
          error: null,
          updatedAt: now,
          completedAt: now,
        })
        .where(eq(knowledgeReindex.knowledgeBaseId, knowledgeBaseId))
      return 'completed'
    })
    if (outcome === 'completed') await auditReindexEnd(knowledgeBaseId, generation)
    return outcome
  } catch (error) {
    if (getPostgresErrorCode(error) === '55P03') return 'busy'
    throw error
  }
}

/**
 * Records how a reindex ended, for whoever asked for it: the switch as a change of the base's
 * model, a failure with its reason. Never fails the reindex itself.
 */
async function auditReindexEnd(
  knowledgeBaseId: string,
  generation: string,
  failure?: { code: KnowledgeReindexErrorCode; message: string }
): Promise<void> {
  try {
    const [row] = await db
      .select({
        name: knowledgeBase.name,
        workspaceId: knowledgeBase.workspaceId,
        requestedBy: knowledgeReindex.requestedBy,
        sourceModel: knowledgeReindex.sourceModel,
        sourceDimension: knowledgeReindex.sourceDimension,
        targetModel: knowledgeReindex.targetModel,
        targetDimension: knowledgeReindex.targetDimension,
      })
      .from(knowledgeReindex)
      .innerJoin(knowledgeBase, eq(knowledgeBase.id, knowledgeReindex.knowledgeBaseId))
      .where(
        and(
          eq(knowledgeReindex.knowledgeBaseId, knowledgeBaseId),
          eq(knowledgeReindex.generation, generation)
        )
      )
      .limit(1)
    if (!row) return
    const base = { id: knowledgeBaseId, name: row.name, workspaceId: row.workspaceId }
    const run = { generation, ...row }
    await recordAuditOnce(
      `knowledge-reindex-${generation}-${failure ? 'failed' : 'completed'}`,
      failure
        ? knowledgeReindexFailedAudit(base, run, row.requestedBy, failure)
        : knowledgeReindexCompletedAudit(base, run, row.requestedBy)
    )
  } catch (error) {
    logger.warn('Could not record the end of a knowledge reindex in the audit log', {
      knowledgeBaseId,
      error: getErrorMessage(error),
    })
  }
}

/**
 * Shows a reindex waiting for its model server as alive: the banner calls a run stalled when its
 * row has not moved for a while.
 */
export async function touchKnowledgeReindex(
  knowledgeBaseId: string,
  generation: string
): Promise<void> {
  await db
    .update(knowledgeReindex)
    .set({ updatedAt: new Date() })
    .where(
      and(
        eq(knowledgeReindex.knowledgeBaseId, knowledgeBaseId),
        eq(knowledgeReindex.generation, generation),
        eq(knowledgeReindex.status, 'running')
      )
    )
}

export type KnowledgeReindexSliceOutcome = 'completed' | 'continue' | 'busy' | 'stale'

/**
 * One processing slice of a reindex: embeds the chunks still missing a vector of the new model,
 * document by document, saving each batch, then attempts the switch. Stops early (`continue`) when
 * the slice is nearly out of time; whatever it saved is kept, so the next slice — or a restarted
 * worker — resumes there. `stale` means the reindex was replaced, finished, or its base is gone.
 */
export async function runKnowledgeReindexSlice(
  knowledgeBaseId: string,
  generation: string,
  options: { signal?: AbortSignal; deadlineAt?: number } = {}
): Promise<KnowledgeReindexSliceOutcome> {
  const state = await readKnowledgeReindexState(knowledgeBaseId)
  if (!state || state.status !== 'running' || state.generation !== generation) return 'stale'
  const [base] = await db
    .select({
      workspaceId: knowledgeBase.workspaceId,
      model: knowledgeBase.embeddingModel,
      dimensions: knowledgeBase.embeddingDimension,
      deletedAt: knowledgeBase.deletedAt,
    })
    .from(knowledgeBase)
    .where(eq(knowledgeBase.id, knowledgeBaseId))
    .limit(1)
  if (!base || base.deletedAt) {
    await failKnowledgeReindex(knowledgeBaseId, generation, {
      code: 'failed',
      message: 'The knowledge base was deleted',
    })
    return 'stale'
  }
  if (base.model !== state.sourceModel || base.dimensions !== state.sourceDimension) {
    await failKnowledgeReindex(knowledgeBaseId, generation, {
      code: 'failed',
      message: 'The embedding model of the knowledge base changed during the reindex',
    })
    return 'stale'
  }

  await refreshProgress(knowledgeBaseId, generation)
  const target = {
    model: state.targetModel,
    dimensions: toKbEmbeddingDimensions(state.targetDimension),
  }
  const context: EmbedContext = {
    knowledgeBaseId,
    generation,
    workspaceId: base.workspaceId,
    target,
    signal: options.signal,
    outOfTime: () =>
      options.deadlineAt !== undefined && Date.now() + EMBED_BATCH_BUDGET_MS >= options.deadlineAt,
  }

  for (let attempt = 0; attempt < MAX_SWITCH_ATTEMPTS_PER_SLICE; attempt++) {
    let cursor = ''
    for (;;) {
      const documents = await db
        .select({ id: document.id })
        .from(document)
        .where(and(eq(document.knowledgeBaseId, knowledgeBaseId), gt(document.id, cursor)))
        .orderBy(asc(document.id))
        .limit(DOCUMENT_PAGE_SIZE)
      if (documents.length === 0) break
      for (const { id } of documents) {
        if ((await embedMissing(context, eq(embedding.documentId, id))) === 'out-of-time') {
          await refreshProgress(knowledgeBaseId, generation)
          return 'continue'
        }
      }
      cursor = documents[documents.length - 1].id
      await refreshProgress(knowledgeBaseId, generation)
    }
    /** Chunks filed under the base without a document row of it, if any, are embedded too. */
    if ((await embedMissing(context)) === 'out-of-time') {
      await refreshProgress(knowledgeBaseId, generation)
      return 'continue'
    }
    const outcome = await switchToTarget(knowledgeBaseId, generation, target)
    if (outcome !== 'incomplete') {
      if (outcome === 'completed') {
        logger.info('Knowledge reindex completed', { knowledgeBaseId, targetModel: target.model })
      }
      return outcome
    }
  }
  return 'continue'
}

/**
 * Ends a running reindex as failed: the base keeps its model and vectors. The vectors computed so
 * far stay staged, so starting again toward the same model resumes from them.
 */
export async function failKnowledgeReindex(
  knowledgeBaseId: string,
  generation: string,
  failure: { code: KnowledgeReindexErrorCode; message: string }
): Promise<void> {
  const now = new Date()
  const failed = await db
    .update(knowledgeReindex)
    .set({
      status: 'failed',
      errorCode: failure.code,
      error: truncate(failure.message, MAX_STORED_ERROR_LENGTH),
      updatedAt: now,
      completedAt: now,
    })
    .where(
      and(
        eq(knowledgeReindex.knowledgeBaseId, knowledgeBaseId),
        eq(knowledgeReindex.generation, generation),
        eq(knowledgeReindex.status, 'running')
      )
    )
    .returning({ id: knowledgeReindex.knowledgeBaseId })
  if (failed.length === 0) return
  logger.warn('Knowledge reindex failed', { knowledgeBaseId, code: failure.code })
  await auditReindexEnd(knowledgeBaseId, generation, failure)
}
