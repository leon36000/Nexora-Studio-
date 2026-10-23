import { getErrorMessage } from '@sim/utils/errors'
import { ProviderCapacityDeferredError } from '@/lib/core/rate-limiter/provider-capacity-error'
import { isPermanentDocumentProcessingError } from '@/lib/knowledge/documents/processing-error'

export type KnowledgeReindexErrorCode = 'model-unavailable' | 'chunk-too-long' | 'failed'

/**
 * How long a reindex waits for an embedding server that is down or too slow to answer (Ollama
 * restarting, loading a model, a CPU busy with other work) before it gives up.
 */
export const KNOWLEDGE_REINDEX_WAIT_WINDOW_MS = 45 * 60 * 1000
const FIRST_WAIT_MS = 30_000
const LATER_WAIT_MS = 60_000

const NETWORK_ERROR_CODES: ReadonlySet<string> = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ETIMEDOUT',
  'EPIPE',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_SOCKET',
])

function isServerUnavailable(error: Error): boolean {
  if (error.name === 'OllamaUnreachableError' || error.name === 'TimeoutError') return true
  if (error instanceof ProviderCapacityDeferredError) return true
  if (error.name === 'EmbeddingAPIError' && 'status' in error) {
    const status = Number(error.status)
    return status === 429 || status === 408 || status >= 500
  }
  const code = 'code' in error ? error.code : undefined
  return typeof code === 'string' && NETWORK_ERROR_CODES.has(code)
}

/** Whether the embedding server was down or too slow, through cause and aggregate wrappers. */
function isEmbeddingServerUnavailable(error: unknown): boolean {
  const pending = [error]
  const seen = new Set<unknown>()
  while (pending.length > 0 && seen.size < 32) {
    const current = pending.pop()
    if (!(current instanceof Error) || seen.has(current)) continue
    seen.add(current)
    if (isServerUnavailable(current)) return true
    if (current.cause !== undefined) pending.push(current.cause)
    if (current instanceof AggregateError) pending.push(...current.errors.slice(0, 32))
  }
  return false
}

export type KnowledgeReindexFailureDecision =
  | { action: 'wait'; since: number; backoffMs: number }
  | { action: 'retry' }
  | { action: 'fail'; failure: { code: KnowledgeReindexErrorCode; message: string } }

/**
 * What a failed slice means for the reindex. An embedding server that is down or too slow is
 * waited for, without spending one of the event's attempts, until it has been unavailable for
 * {@link KNOWLEDGE_REINDEX_WAIT_WINDOW_MS}; a model that is not installed or a passage it cannot
 * take will not fix itself and fails at once; anything else is retried until the last attempt.
 * A failure leaves the base on its current index.
 */
export function decideKnowledgeReindexFailure(
  error: unknown,
  context: { now: number; waitingSince: number | null; lastAttempt: boolean }
): KnowledgeReindexFailureDecision {
  const message = getErrorMessage(error, 'Reindex failed')
  if (error instanceof Error && error.name === 'OllamaEmbeddingModelNotFoundError') {
    return { action: 'fail', failure: { code: 'model-unavailable', message } }
  }
  if (isPermanentDocumentProcessingError(error) && error.code === 'document_complexity_limit') {
    return { action: 'fail', failure: { code: 'chunk-too-long', message } }
  }
  if (isEmbeddingServerUnavailable(error)) {
    const since = context.waitingSince ?? context.now
    if (context.now - since > KNOWLEDGE_REINDEX_WAIT_WINDOW_MS) {
      return { action: 'fail', failure: { code: 'model-unavailable', message } }
    }
    return {
      action: 'wait',
      since,
      backoffMs: context.waitingSince === null ? FIRST_WAIT_MS : LATER_WAIT_MS,
    }
  }
  if (!context.lastAttempt) return { action: 'retry' }
  return { action: 'fail', failure: { code: 'failed', message } }
}
