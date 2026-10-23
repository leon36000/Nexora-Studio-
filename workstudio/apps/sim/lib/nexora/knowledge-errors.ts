/** Processing failures of a knowledge-base document that get a dedicated French explanation. */
export type KnowledgeProcessingErrorKind = 'embeddingUnavailable' | 'embeddingModelLoading'

/**
 * Nexora edition: recognizes, in the stored processing error of a document, the two failures an
 * administrator can fix (no embedding provider; the local model is still downloading), so the
 * interface explains them instead of showing the provider's raw English message.
 */
export function classifyKnowledgeProcessingError(
  message: string | null | undefined
): KnowledgeProcessingErrorKind | null {
  if (!message) return null
  if (/embedding provider is not configured/i.test(message)) return 'embeddingUnavailable'
  if (/model\b.*\bnot found/i.test(message) && /pull/i.test(message)) return 'embeddingModelLoading'
  return null
}
