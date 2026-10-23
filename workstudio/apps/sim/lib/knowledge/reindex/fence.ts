import type { db } from '@sim/db'
import { knowledgeBase } from '@sim/db/schema'
import { eq } from 'drizzle-orm'
import { OrchestrationError } from '@/lib/core/orchestration/types'

/** The base moved to another embedding model after the caller computed its vectors. */
export class KnowledgeEmbeddingModelChangedError extends OrchestrationError {
  constructor(knowledgeBaseId: string) {
    super(
      'conflict',
      `The embedding model of knowledge base ${knowledgeBaseId} changed while its vectors were computed; retry so they are computed with the new model`
    )
    this.name = 'KnowledgeEmbeddingModelChangedError'
  }
}

/**
 * Called inside every transaction that writes chunk vectors, before it writes them. It takes a
 * key-share lock on the base, which the reindex switch waits for (it holds the base for update
 * while it changes the model), and checks the base still uses the model the vectors were computed
 * with. A writer therefore either commits before the switch, whose final check then sees its
 * chunks, or reads the new model here and refuses: a base never ends up with vectors of two models.
 */
export async function lockKnowledgeEmbeddingTarget(
  executor: Pick<typeof db, 'select'>,
  knowledgeBaseId: string,
  expected: { model: string; dimensions: number }
): Promise<void> {
  const [base] = await executor
    .select({
      model: knowledgeBase.embeddingModel,
      dimensions: knowledgeBase.embeddingDimension,
    })
    .from(knowledgeBase)
    .where(eq(knowledgeBase.id, knowledgeBaseId))
    .for('key share')
  if (base && (base.model !== expected.model || base.dimensions !== expected.dimensions)) {
    throw new KnowledgeEmbeddingModelChangedError(knowledgeBaseId)
  }
}
