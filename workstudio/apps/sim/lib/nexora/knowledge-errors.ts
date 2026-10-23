/** Processing failures of a knowledge-base document that get a dedicated French explanation. */
export type KnowledgeProcessingErrorKind =
  | 'embeddingUnavailable'
  | 'embeddingModelLoading'
  | 'noOcrModel'
  | 'noTranscriptionModel'

/**
 * Stored as the processing error of a scan, an image or a recording the instance has no model to
 * read; permanent until an administrator adds one in Réglages › Modèles and the document is retried.
 */
export const NO_OCR_MODEL_MESSAGE =
  'No OCR model is set up: an administrator adds a Vision / OCR model in Réglages › Modèles, then retries this document.'
export const NO_TRANSCRIPTION_MODEL_MESSAGE =
  'No transcription model is set up: an administrator adds a Transcription model in Réglages › Modèles, then retries this document.'

/**
 * Nexora edition: recognizes, in the stored processing error of a document, the failures an
 * administrator can fix (no embedding provider; the local model is still downloading; no model to
 * read a scan or transcribe a recording), so the
 * interface explains them instead of showing the provider's raw English message.
 */
export function classifyKnowledgeProcessingError(
  message: string | null | undefined
): KnowledgeProcessingErrorKind | null {
  if (!message) return null
  if (message === NO_OCR_MODEL_MESSAGE) return 'noOcrModel'
  if (message === NO_TRANSCRIPTION_MODEL_MESSAGE) return 'noTranscriptionModel'
  if (/embedding provider is not configured/i.test(message)) return 'embeddingUnavailable'
  // The embedding client keeps only the status; on the bundled Ollama a 404 means the model
  // is not there yet (still downloading after an install or update, or not pulled).
  if (/Embedding API failed: 404\b/.test(message)) return 'embeddingModelLoading'
  return null
}

/**
 * A knowledge base indexed with a model this instance no longer serves (for example
 * `text-embedding-3-small` from before the local embeddings): it cannot be searched again and
 * must be recreated. Bases on any model of the bundled Ollama stay usable.
 */
export function isLegacyEmbeddingBase(
  embeddingModel: string,
  instanceModel: string | undefined
): boolean {
  if (!instanceModel) return false
  return embeddingModel !== instanceModel && !embeddingModel.startsWith('ollama/')
}
