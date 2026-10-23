/**
 * Re-embedding a knowledge base with another model, against real PostgreSQL: the base keeps its
 * current vectors until a vector of the new model exists for every chunk, then switches in one
 * transaction; an interrupted run resumes after the batches it saved; a failure leaves the
 * current index active. The embedding model is the only fixture.
 */
import { db } from '@sim/db'
import {
  document,
  embedding,
  embeddingSearch,
  knowledgeBase,
  knowledgeReindexVector,
  organization,
  outboxEvent,
  user,
  workspace,
} from '@sim/db/schema'
import { assertDisposableTestDatabaseUrl } from '@sim/db/testing/test-infrastructure'
import { deleteWorkspaceFixture, insertWorkspaceFixture } from '@sim/db/testing/workspace-fixtures'
import { sha256Hex } from '@sim/security/hash'
import { generateId } from '@sim/utils/id'
import { eq, isNotNull } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const fixtures = vi.hoisted(() => ({ embed: vi.fn() }))
vi.mock('@/lib/knowledge/embeddings', () => ({ generateEmbeddings: fixtures.embed }))

import type { OutboxEventContext } from '@/lib/core/outbox/service'
import { OllamaEmbeddingModelNotFoundError } from '@/lib/embeddings/ollama-model-catalog.server'
import {
  KnowledgeEmbeddingModelChangedError,
  lockKnowledgeEmbeddingTarget,
} from '@/lib/knowledge/reindex/fence'
import { KNOWLEDGE_REINDEX_EVENT } from '@/lib/knowledge/reindex/outbox-event'
import { knowledgeReindexOutboxHandlers } from '@/lib/knowledge/reindex/outbox-handler'
import {
  KnowledgeReindexConflictError,
  readKnowledgeReindexState,
  runKnowledgeReindexSlice,
  startKnowledgeReindex,
} from '@/lib/knowledge/reindex/service'

const OLD = { model: 'ollama/bge-m3', dimensions: 1024 as const }
const NEW = { model: 'ollama/nomic-embed-text', dimensions: 768 as const }
const ownerId = generateId()
const organizationId = generateId()
const workspaceId = generateId()

function vectorOf(text: string, dimensions: number): number[] {
  const seed = (Number.parseInt(sha256Hex(text).slice(0, 6), 16) % 1000) / 1000
  return Array.from({ length: dimensions }, (_, index) => (index === 0 ? seed : 0.01))
}

/** A deterministic embedding model; `abortAtCall` aborts the run at that call, like a restart. */
function embeddingModel(options: { abortAtCall?: number; controller?: AbortController } = {}) {
  const calls: string[][] = []
  fixtures.embed.mockImplementation(
    async (texts: string[], target: { dimensions: number }, _workspaceId, signal?: AbortSignal) => {
      calls.push(texts)
      if (options.abortAtCall === calls.length) {
        options.controller?.abort(new Error('worker restarted'))
        signal?.throwIfAborted()
      }
      return {
        embeddings: texts.map((text) => vectorOf(text, target.dimensions)),
        totalTokens: 0,
        billableTokens: 0,
        isBYOK: false,
        modelName: 'fixture',
        pricingId: 'fixture',
      }
    }
  )
  return calls
}

async function seedBase(documents: number, chunksPerDocument: number) {
  const knowledgeBaseId = generateId()
  await db.insert(knowledgeBase).values({
    id: knowledgeBaseId,
    userId: ownerId,
    workspaceId,
    name: `Reindex fixture ${knowledgeBaseId}`,
    embeddingModel: OLD.model,
    embeddingDimension: OLD.dimensions,
  })
  for (let d = 0; d < documents; d++) await addDocument(knowledgeBaseId, chunksPerDocument)
  return knowledgeBaseId
}

/** A document indexed with the base's current (old) model, as the processing pass writes one. */
async function addDocument(knowledgeBaseId: string, chunks: number) {
  const documentId = generateId()
  await db.insert(document).values({
    id: documentId,
    knowledgeBaseId,
    filename: `${documentId}.txt`,
    fileUrl: `https://files.local/${documentId}.txt`,
    fileSize: 10,
    mimeType: 'text/plain',
    chunkCount: chunks,
    processingStatus: 'completed',
  })
  await db.insert(embedding).values(
    Array.from({ length: chunks }, (_, chunkIndex) => {
      const content = `Document ${documentId} passage ${chunkIndex}`
      return {
        id: generateId(),
        knowledgeBaseId,
        documentId,
        chunkIndex,
        chunkHash: sha256Hex(content),
        content,
        contentLength: content.length,
        tokenCount: 8,
        startOffset: 0,
        endOffset: content.length,
        embeddingModel: OLD.model,
        embedding1024: vectorOf(content, 1024),
      }
    })
  )
  return documentId
}

async function chunksOf(knowledgeBaseId: string) {
  return db
    .select({
      id: embedding.id,
      content: embedding.content,
      model: embedding.embeddingModel,
      hasOld: isNotNull(embedding.embedding1024),
      hasNew: isNotNull(embedding.embedding768),
    })
    .from(embedding)
    .where(eq(embedding.knowledgeBaseId, knowledgeBaseId))
}

async function baseModel(knowledgeBaseId: string) {
  const [row] = await db
    .select({ model: knowledgeBase.embeddingModel, dimensions: knowledgeBase.embeddingDimension })
    .from(knowledgeBase)
    .where(eq(knowledgeBase.id, knowledgeBaseId))
  return row
}

function handlerContext(attempts = 0): OutboxEventContext {
  return {
    eventId: generateId(),
    eventType: KNOWLEDGE_REINDEX_EVENT,
    attempts,
    maxAttempts: 5,
    signal: new AbortController().signal,
    deadlineAt: Date.now() + 500_000,
    checkpointPayload: vi.fn(),
  }
}

describe('knowledge base reindex', () => {
  beforeAll(async () => {
    assertDisposableTestDatabaseUrl(process.env.DATABASE_URL ?? '')
    const now = new Date()
    await db.insert(user).values({
      id: ownerId,
      name: 'Reindex owner',
      email: `${ownerId}@fixture.test`,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    })
    await db.insert(organization).values({
      id: organizationId,
      name: 'Reindex organization',
      slug: organizationId,
    })
    await insertWorkspaceFixture(db, {
      id: workspaceId,
      organizationId,
      name: 'Reindex fixture',
      ownerId,
      billedAccountUserId: ownerId,
    })
  })

  beforeEach(() => {
    fixtures.embed.mockReset()
  })

  afterAll(async () => {
    await db.delete(outboxEvent).where(eq(outboxEvent.eventType, KNOWLEDGE_REINDEX_EVENT))
    await db.delete(knowledgeBase).where(eq(knowledgeBase.workspaceId, workspaceId))
    await deleteWorkspaceFixture(db, eq(workspace.id, workspaceId))
    await db.delete(organization).where(eq(organization.id, organizationId))
    await db.delete(user).where(eq(user.id, ownerId))
    await db.$client.end()
  })

  it('keeps the current index through an interrupted run, resumes after the saved batches and switches every chunk at once', async () => {
    const knowledgeBaseId = await seedBase(2, 3)
    const { generation } = await startKnowledgeReindex({
      knowledgeBaseId,
      target: NEW,
      requestedBy: ownerId,
    })
    const [event] = await db
      .select({ type: outboxEvent.eventType })
      .from(outboxEvent)
      .where(eq(outboxEvent.id, `knowledge-reindex-${generation}`))
    expect(event?.type).toBe(KNOWLEDGE_REINDEX_EVENT)

    const controller = new AbortController()
    const interrupted = embeddingModel({ abortAtCall: 2, controller })
    await expect(
      runKnowledgeReindexSlice(knowledgeBaseId, generation, {
        signal: controller.signal,
        deadlineAt: Date.now() + 500_000,
      })
    ).rejects.toThrow()
    expect(interrupted).toHaveLength(2)

    expect(await baseModel(knowledgeBaseId)).toEqual({ model: OLD.model, dimensions: 1024 })
    const during = await chunksOf(knowledgeBaseId)
    expect(
      during.every((chunk) => chunk.model === OLD.model && chunk.hasOld && !chunk.hasNew)
    ).toBe(true)
    const saved = await db
      .select({ id: knowledgeReindexVector.embeddingId })
      .from(knowledgeReindexVector)
      .where(eq(knowledgeReindexVector.knowledgeBaseId, knowledgeBaseId))
    expect(saved).toHaveLength(3)
    expect((await readKnowledgeReindexState(knowledgeBaseId))?.status).toBe('running')

    const resumed = embeddingModel()
    await expect(
      runKnowledgeReindexSlice(knowledgeBaseId, generation, {
        signal: new AbortController().signal,
        deadlineAt: Date.now() + 500_000,
      })
    ).resolves.toBe('completed')
    expect(resumed.flat()).toHaveLength(3)

    expect(await baseModel(knowledgeBaseId)).toEqual({ model: NEW.model, dimensions: 768 })
    const after = await chunksOf(knowledgeBaseId)
    expect(after).toHaveLength(6)
    expect(after.every((chunk) => chunk.model === NEW.model && chunk.hasNew && !chunk.hasOld)).toBe(
      true
    )
    const searched = await db
      .select({
        hasNew: isNotNull(embeddingSearch.vector768),
        hasOld: isNotNull(embeddingSearch.vector1024),
      })
      .from(embeddingSearch)
      .where(eq(embeddingSearch.knowledgeBaseId, knowledgeBaseId))
    expect(searched).toHaveLength(6)
    expect(searched.every((row) => row.hasNew && !row.hasOld)).toBe(true)
    const leftover = await db
      .select({ id: knowledgeReindexVector.embeddingId })
      .from(knowledgeReindexVector)
      .where(eq(knowledgeReindexVector.knowledgeBaseId, knowledgeBaseId))
    expect(leftover).toHaveLength(0)
    expect(await readKnowledgeReindexState(knowledgeBaseId)).toMatchObject({
      status: 'completed',
      totalChunks: 6,
      embeddedChunks: 6,
      targetModel: NEW.model,
    })
  })

  it('embeds again the chunks written or edited with the old model while it ran', async () => {
    const knowledgeBaseId = await seedBase(2, 1)
    const { generation } = await startKnowledgeReindex({
      knowledgeBaseId,
      target: NEW,
      requestedBy: ownerId,
    })
    const controller = new AbortController()
    embeddingModel({ abortAtCall: 2, controller })
    await expect(
      runKnowledgeReindexSlice(knowledgeBaseId, generation, {
        signal: controller.signal,
        deadlineAt: Date.now() + 500_000,
      })
    ).rejects.toThrow()

    const lateDocument = await addDocument(knowledgeBaseId, 2)
    const [edited] = await db
      .select({ id: knowledgeReindexVector.embeddingId })
      .from(knowledgeReindexVector)
      .where(eq(knowledgeReindexVector.knowledgeBaseId, knowledgeBaseId))
    const editedContent = 'Passage corrigé à la main'
    await db
      .update(embedding)
      .set({ content: editedContent, chunkHash: sha256Hex(editedContent) })
      .where(eq(embedding.id, edited.id))

    const calls = embeddingModel()
    await expect(
      runKnowledgeReindexSlice(knowledgeBaseId, generation, {
        signal: new AbortController().signal,
        deadlineAt: Date.now() + 500_000,
      })
    ).resolves.toBe('completed')
    const embedded = calls.flat()
    expect(embedded).toContain(editedContent)
    expect(embedded.filter((text) => text.includes(lateDocument))).toHaveLength(2)
    const after = await chunksOf(knowledgeBaseId)
    expect(after).toHaveLength(4)
    expect(after.every((chunk) => chunk.model === NEW.model && chunk.hasNew && !chunk.hasOld)).toBe(
      true
    )
  })

  it('refuses a chunk write computed with the model the base no longer uses', async () => {
    const knowledgeBaseId = await seedBase(1, 1)
    const { generation } = await startKnowledgeReindex({
      knowledgeBaseId,
      target: NEW,
      requestedBy: ownerId,
    })
    embeddingModel()
    await runKnowledgeReindexSlice(knowledgeBaseId, generation, {
      signal: new AbortController().signal,
      deadlineAt: Date.now() + 500_000,
    })

    await expect(
      db.transaction((tx) => lockKnowledgeEmbeddingTarget(tx, knowledgeBaseId, OLD))
    ).rejects.toBeInstanceOf(KnowledgeEmbeddingModelChangedError)
    await expect(
      db.transaction((tx) => lockKnowledgeEmbeddingTarget(tx, knowledgeBaseId, NEW))
    ).resolves.toBeUndefined()
  })

  it('leaves the current index active and says why when the new model cannot embed', async () => {
    const knowledgeBaseId = await seedBase(1, 2)
    const { generation } = await startKnowledgeReindex({
      knowledgeBaseId,
      target: NEW,
      requestedBy: ownerId,
    })
    fixtures.embed.mockRejectedValue(new OllamaEmbeddingModelNotFoundError(NEW.model))

    await knowledgeReindexOutboxHandlers[KNOWLEDGE_REINDEX_EVENT](
      { knowledgeBaseId, generation },
      handlerContext()
    )

    expect(await readKnowledgeReindexState(knowledgeBaseId)).toMatchObject({
      status: 'failed',
      errorCode: 'model-unavailable',
    })
    expect(await baseModel(knowledgeBaseId)).toEqual({ model: OLD.model, dimensions: 1024 })
    const chunks = await chunksOf(knowledgeBaseId)
    expect(chunks.every((chunk) => chunk.model === OLD.model && chunk.hasOld)).toBe(true)
    const leftover = await db
      .select({ id: knowledgeReindexVector.embeddingId })
      .from(knowledgeReindexVector)
      .where(eq(knowledgeReindexVector.knowledgeBaseId, knowledgeBaseId))
    expect(leftover).toHaveLength(0)
  })

  it('runs one reindex at a time and refuses the model the base already uses', async () => {
    const knowledgeBaseId = await seedBase(1, 1)
    await expect(
      startKnowledgeReindex({ knowledgeBaseId, target: OLD, requestedBy: ownerId })
    ).rejects.toThrow()
    await startKnowledgeReindex({ knowledgeBaseId, target: NEW, requestedBy: ownerId })
    await expect(
      startKnowledgeReindex({
        knowledgeBaseId,
        target: { model: 'ollama/mxbai-embed-large', dimensions: 1024 },
        requestedBy: ownerId,
      })
    ).rejects.toBeInstanceOf(KnowledgeReindexConflictError)
    expect(await readKnowledgeReindexState(knowledgeBaseId)).toMatchObject({
      status: 'running',
      targetModel: NEW.model,
    })
  })
})
