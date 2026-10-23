import { describe, expect, it } from 'vitest'
import { classifyKnowledgeProcessingError } from '@/lib/nexora/knowledge-errors'

describe('classifyKnowledgeProcessingError', () => {
  it('recognizes a missing embedding provider', () => {
    expect(
      classifyKnowledgeProcessingError(
        'Semantic retrieval is unavailable because its embedding provider is not configured.'
      )
    ).toBe('embeddingUnavailable')
  })

  it('recognizes a local model that Ollama has not finished downloading', () => {
    expect(
      classifyKnowledgeProcessingError(
        'Ollama embeddings failed (404): {"error":"model \\"bge-m3\\" not found, try pulling it first"}'
      )
    ).toBe('embeddingModelLoading')
  })

  it('leaves every other error to be shown as it is', () => {
    expect(classifyKnowledgeProcessingError('File is empty')).toBeNull()
    expect(classifyKnowledgeProcessingError(null)).toBeNull()
  })
})
