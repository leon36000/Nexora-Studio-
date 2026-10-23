import { NextResponse } from 'next/server'
import { NexoraModelAdminUnavailableError, NexoraModelError } from '@/lib/nexora/model-admin'
import { OllamaUnavailableError } from '@/lib/nexora/ollama'

const STATUS_BY_CODE = {
  'not-found': 404,
  duplicate: 409,
  'is-default': 409,
  invalid: 400,
  unreachable: 400,
} as const

/** A refused admin check: 401 without a session, 403 otherwise. */
export function deniedResponse(status: 401 | 403): NextResponse {
  return NextResponse.json({ error: status === 401 ? 'Unauthorized' : 'Forbidden' }, { status })
}

/**
 * Projects a model administration failure as `{ error: <code> }`: the settings page words each
 * code in French. Upstream details (which may quote an address) stay in the server logs.
 */
export function modelErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof NexoraModelError) {
    return NextResponse.json({ error: error.code }, { status: STATUS_BY_CODE[error.code] })
  }
  if (
    error instanceof NexoraModelAdminUnavailableError ||
    error instanceof OllamaUnavailableError
  ) {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  }
  return null
}
