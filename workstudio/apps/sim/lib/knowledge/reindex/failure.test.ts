/**
 * What a failed reindex slice means: an embedding server that is down or slow is waited for,
 * without spending the event's few attempts, for a bounded window; a missing model or a passage
 * too long fails at once; anything else is retried until the last attempt.
 */
import { describe, expect, it } from 'vitest'
import { ProviderCapacityDeferredError } from '@/lib/core/rate-limiter/provider-capacity-error'
import { EmbeddingAPIError } from '@/lib/embeddings/api-error'
import {
  OllamaEmbeddingModelNotFoundError,
  OllamaUnreachableError,
} from '@/lib/embeddings/ollama-model-catalog.server'
import { PermanentDocumentProcessingError } from '@/lib/knowledge/documents/processing-error'
import {
  decideKnowledgeReindexFailure,
  KNOWLEDGE_REINDEX_WAIT_WINDOW_MS,
} from '@/lib/knowledge/reindex/failure'

const now = Date.parse('2026-10-23T10:00:00Z')

function refused(code: string): Error {
  return new TypeError('fetch failed', { cause: Object.assign(new Error(code), { code }) })
}

const serverDown = [
  new OllamaUnreachableError('connect ECONNREFUSED 172.18.0.4:11434'),
  new ProviderCapacityDeferredError('provider_timeout', { providerId: 'ollama' }),
  new EmbeddingAPIError('Embedding API failed: 503', 503),
  new EmbeddingAPIError('Embedding API failed: 429', 429),
  refused('ECONNREFUSED'),
  new AggregateError([refused('ECONNRESET')], 'Embedding batches could not complete'),
  new DOMException('The operation timed out', 'TimeoutError'),
]

describe('decideKnowledgeReindexFailure', () => {
  it('waits for an embedding server that is down or slow, even on the last attempt', () => {
    for (const error of serverDown) {
      for (const lastAttempt of [false, true]) {
        expect(
          decideKnowledgeReindexFailure(error, { now, waitingSince: null, lastAttempt })
        ).toMatchObject({ action: 'wait', since: now })
      }
    }
  })

  it('keeps counting the wait from when the server first stopped answering', () => {
    const since = now - 10 * 60 * 1000
    const decision = decideKnowledgeReindexFailure(serverDown[0], {
      now,
      waitingSince: since,
      lastAttempt: false,
    })
    expect(decision).toMatchObject({ action: 'wait', since })
    if (decision.action === 'wait') expect(decision.backoffMs).toBeGreaterThanOrEqual(30_000)
  })

  it('gives up with « model unavailable » once the server stayed down for the whole window', () => {
    expect(
      decideKnowledgeReindexFailure(serverDown[0], {
        now,
        waitingSince: now - KNOWLEDGE_REINDEX_WAIT_WINDOW_MS - 1,
        lastAttempt: false,
      })
    ).toMatchObject({ action: 'fail', failure: { code: 'model-unavailable' } })
  })

  it('fails at once a model that is not installed or a passage the model cannot take', () => {
    expect(
      decideKnowledgeReindexFailure(new OllamaEmbeddingModelNotFoundError('ollama/x'), {
        now,
        waitingSince: null,
        lastAttempt: false,
      })
    ).toMatchObject({ action: 'fail', failure: { code: 'model-unavailable' } })
    expect(
      decideKnowledgeReindexFailure(
        new PermanentDocumentProcessingError('document_complexity_limit', 'too long'),
        { now, waitingSince: null, lastAttempt: false }
      )
    ).toMatchObject({ action: 'fail', failure: { code: 'chunk-too-long' } })
  })

  it('retries any other failure until the last attempt, then fails', () => {
    const error = new Error('unexpected')
    expect(
      decideKnowledgeReindexFailure(error, { now, waitingSince: null, lastAttempt: false })
    ).toEqual({ action: 'retry' })
    expect(
      decideKnowledgeReindexFailure(error, { now, waitingSince: null, lastAttempt: true })
    ).toMatchObject({ action: 'fail', failure: { code: 'failed' } })
  })
})
