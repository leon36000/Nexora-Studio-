/**
 * The audit trail of a reindex: its start names the model asked for without claiming the base
 * changed yet; the base's model is recorded as changed only at the switch; a failure says why and
 * that the base kept its index.
 */
import { describe, expect, it } from 'vitest'
import {
  knowledgeReindexCompletedAudit,
  knowledgeReindexFailedAudit,
  knowledgeReindexStartedAudit,
} from '@/lib/knowledge/reindex/audit'

const base = { id: 'kb-1', name: 'Procédures', workspaceId: 'ws-1' }
const run = {
  generation: 'gen-1',
  sourceModel: 'ollama/bge-m3',
  sourceDimension: 1024,
  targetModel: 'ollama/nomic-embed-text',
  targetDimension: 768,
}

describe('knowledge reindex audit', () => {
  it('records the start with the model asked for, not as a change of the base model', () => {
    const entry = knowledgeReindexStartedAudit(base, run)
    expect(entry.action).toBe('knowledge_base.reindex_started')
    expect(entry.metadata).toMatchObject({
      currentEmbeddingModel: 'ollama/bge-m3',
      targetEmbeddingModel: 'ollama/nomic-embed-text',
      targetEmbeddingDimension: 768,
    })
    expect(entry.metadata).not.toHaveProperty('updatedFields')
  })

  it('records the base model as changed when the reindex switches it', () => {
    const entry = knowledgeReindexCompletedAudit(base, run, 'user-1')
    expect(entry).toMatchObject({
      action: 'knowledge_base.updated',
      actorId: 'user-1',
      workspaceId: 'ws-1',
      resourceId: 'kb-1',
      metadata: {
        updatedFields: ['embeddingModel', 'embeddingDimension'],
        previousEmbeddingModel: 'ollama/bge-m3',
        embeddingModel: 'ollama/nomic-embed-text',
      },
    })
  })

  it('records a failure with its reason and the model the base keeps', () => {
    const entry = knowledgeReindexFailedAudit(base, run, null, {
      code: 'model-unavailable',
      message: 'The configured Ollama server could not be reached',
    })
    expect(entry).toMatchObject({
      action: 'knowledge_base.reindex_failed',
      actorId: null,
      metadata: { errorCode: 'model-unavailable', embeddingModel: 'ollama/bge-m3' },
    })
  })
})
