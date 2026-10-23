/** Processing failures of a knowledge-base document that get a dedicated French explanation. */
export type KnowledgeProcessingErrorKind =
  | 'embeddingUnavailable'
  | 'embeddingModelLoading'
  | 'noOcrModel'
  | 'noTranscriptionModel'
  | 'transcriptionNotConfigured'
  | 'noSpeech'
  | 'recordingTooLong'
  | 'ocrRejected'
  | 'pieceTooLong'

/**
 * Stored as the processing error of a scan, an image or a recording the instance has no model to
 * read; permanent until an administrator adds one in Réglages › Modèles and the document is retried.
 */
export const NO_OCR_MODEL_MESSAGE =
  'No OCR model is set up: an administrator adds a Vision / OCR model in Réglages › Modèles, then retries this document.'
export const NO_TRANSCRIPTION_MODEL_MESSAGE =
  'No transcription model is set up: an administrator adds a Transcription model in Réglages › Modèles, then retries this document.'

export const TRANSCRIPTION_NOT_CONFIGURED_MESSAGE =
  'Recordings are indexed through a Nexora transcription model, which this deployment does not configure.'
export const NO_SPEECH_MESSAGE = 'No speech could be recognised in this recording.'
/**
 * A page of a scan (or a piece of a recording) that its processing slice could not finish twice:
 * the model is too slow on this server for one page, so retrying would loop.
 */
export const PIECE_TOO_LONG_MESSAGE =
  'This page (or piece of recording) takes too long for this server: try a smaller model or a more powerful server.'

/**
 * Nexora edition: recognizes, in the stored processing error of a document, the failures an
 * administrator can fix (no embedding provider; the local model is still downloading; no model to
 * read a scan or transcribe a recording) and the Nexora reading and transcription limits, so the
 * interface explains them in the user's language instead of the stored English message.
 */
export function classifyKnowledgeProcessingError(
  message: string | null | undefined
): KnowledgeProcessingErrorKind | null {
  if (!message) return null
  if (message === NO_OCR_MODEL_MESSAGE) return 'noOcrModel'
  if (message === NO_TRANSCRIPTION_MODEL_MESSAGE) return 'noTranscriptionModel'
  if (message === TRANSCRIPTION_NOT_CONFIGURED_MESSAGE) return 'transcriptionNotConfigured'
  if (message === NO_SPEECH_MESSAGE) return 'noSpeech'
  if (message === PIECE_TOO_LONG_MESSAGE) return 'pieceTooLong'
  if (/^This recording lasts \d+ min; a block transcribes at most/.test(message)) {
    return 'recordingTooLong'
  }
  if (/^The OCR provider rejected this file \(HTTP \d+\)/.test(message)) return 'ocrRejected'
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
