import { getErrorMessage } from '@sim/utils/errors'
import { describe, expect, it, vi } from 'vitest'
import { embed } from '@/lib/embeddings/client'
import { OcrRequestRejectedError } from '@/lib/knowledge/documents/processing-error'
import { transcribeAudio } from '@/lib/nexora/document-ai/transcription'
import {
  classifyKnowledgeProcessingError,
  isLegacyEmbeddingBase,
  NO_SPEECH_MESSAGE,
  PIECE_TOO_LONG_MESSAGE,
  TRANSCRIPTION_NOT_CONFIGURED_MESSAGE,
} from '@/lib/nexora/knowledge-errors'

vi.mock('@/lib/core/rate-limiter/provider-admission', () => ({
  waitForProviderAdmission: vi.fn().mockResolvedValue(undefined),
  ProviderQuotaExhaustedError: class ProviderQuotaExhaustedError extends Error {},
  PROVIDER_QUOTA_COOLDOWN_MS: 300_000,
  isProviderQuotaExhausted: vi.fn().mockResolvedValue(false),
  recordProviderCooldown: vi.fn(),
}))

describe('classifyKnowledgeProcessingError', () => {
  it('recognizes a missing embedding provider', () => {
    expect(
      classifyKnowledgeProcessingError(
        'Semantic retrieval is unavailable because its embedding provider is not configured.'
      )
    ).toBe('embeddingUnavailable')
  })

  it('recognizes the error the embedding client raises while Ollama is still downloading', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { error: 'model "bge-m3" not found, try pulling it first' },
            { status: 404 }
          )
        )
    )
    const failure = await embed(['Horaires de livraison'], {
      model: 'ollama/bge-m3',
      projectInputs: null,
    }).catch((error: unknown) => error)
    expect(classifyKnowledgeProcessingError(getErrorMessage(failure))).toBe('embeddingModelLoading')
  })

  it('explains in French why a recording or a scan could not be indexed', async () => {
    const tooLong = await transcribeAudio(
      { audio: Buffer.from('audio'), mimeType: 'audio/mpeg', fileName: 'seminaire.mp3' },
      {
        measure: async () => 4 * 60 * 60,
        cut: async () => Buffer.alloc(0),
        transcribe: async () => '',
      }
    ).then(
      () => 'transcribed',
      (error: unknown) => getErrorMessage(error)
    )
    expect(classifyKnowledgeProcessingError(tooLong)).toBe('recordingTooLong')
    expect(classifyKnowledgeProcessingError(new OcrRequestRejectedError(422).message)).toBe(
      'ocrRejected'
    )
    expect(classifyKnowledgeProcessingError(TRANSCRIPTION_NOT_CONFIGURED_MESSAGE)).toBe(
      'transcriptionNotConfigured'
    )
    expect(classifyKnowledgeProcessingError(NO_SPEECH_MESSAGE)).toBe('noSpeech')
    expect(classifyKnowledgeProcessingError(PIECE_TOO_LONG_MESSAGE)).toBe('pieceTooLong')
  })

  it('recognizes a model server that could not be reached, as Bun and Node word it', () => {
    for (const message of [
      'getaddrinfo ETIMEOUT ollama',
      'getaddrinfo ENOTFOUND ollama',
      'connect ECONNREFUSED 172.18.0.4:11434',
      'Unable to connect. Is the computer able to access the url?',
      'Nexora API did not answer: getaddrinfo ETIMEOUT nexora-api',
    ]) {
      expect(classifyKnowledgeProcessingError(message), message).toBe('serviceUnreachable')
    }
  })

  it('leaves every other error to be shown as it is', () => {
    expect(classifyKnowledgeProcessingError('File is empty')).toBeNull()
    expect(
      classifyKnowledgeProcessingError('Please connect the scanner ECONNREFUSED-free')
    ).toBeNull()
    expect(classifyKnowledgeProcessingError(null)).toBeNull()
  })
})

describe('isLegacyEmbeddingBase', () => {
  it('flags a base created with a model the instance no longer serves', () => {
    expect(isLegacyEmbeddingBase('text-embedding-3-small', 'ollama/bge-m3')).toBe(true)
  })

  it('keeps bases on the current model, on another local model, or when the instance model is unknown', () => {
    expect(isLegacyEmbeddingBase('ollama/bge-m3', 'ollama/bge-m3')).toBe(false)
    expect(isLegacyEmbeddingBase('ollama/nomic-embed-text', 'ollama/bge-m3')).toBe(false)
    expect(isLegacyEmbeddingBase('text-embedding-3-small', undefined)).toBe(false)
  })
})
