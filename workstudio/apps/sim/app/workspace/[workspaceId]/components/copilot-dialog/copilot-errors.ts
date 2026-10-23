import { isApiClientError } from '@/lib/api/client/errors'

type CopilotErrorKey =
  | 'planInvalid'
  | 'rejected'
  | 'unavailable'
  | 'rateLimited'
  | 'forbidden'
  | 'notFound'
  | 'locked'
  | 'unknown'

export interface CopilotErrorMessage {
  key: CopilotErrorKey
  values?: Record<string, string>
}

/**
 * The French message (key in `copilot.dialog.errors`) for a failed plan or creation request, or
 * `null` when the person cancelled it. Only the server's `plan-invalid` detail and the model's
 * refusal reason are shown verbatim (both are written for the person); any other server text
 * stays hidden behind a generic message.
 */
export function copilotErrorMessage(error: unknown): CopilotErrorMessage | null {
  if (error instanceof DOMException && error.name === 'AbortError') return null
  if (!isApiClientError(error)) return { key: 'unknown' }

  if (error.code === 'plan-invalid')
    return { key: 'planInvalid', values: { detail: error.message } }
  if (error.code === 'rejected') return { key: 'rejected', values: { reason: error.message } }
  if (error.code === 'unavailable' || error.status === 503) return { key: 'unavailable' }
  if (error.status === 429) return { key: 'rateLimited' }
  if (error.status === 403) return { key: 'forbidden' }
  if (error.status === 404) return { key: 'notFound' }
  if (error.status === 423) return { key: 'locked' }
  return { key: 'unknown' }
}
