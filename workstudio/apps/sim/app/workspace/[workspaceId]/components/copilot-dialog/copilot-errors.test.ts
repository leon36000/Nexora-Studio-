import { describe, expect, it } from 'vitest'
import { ApiClientError } from '@/lib/api/client/errors'
import { copilotErrorMessage } from '@/app/workspace/[workspaceId]/components/copilot-dialog/copilot-errors'

function apiError(status: number, body: { error?: string; code?: string } = {}) {
  return new ApiClientError({
    status,
    message: body.error ?? `Request failed with ${status}`,
    body,
    code: body.code,
  })
}

describe('copilotErrorMessage', () => {
  it('stays silent when the person cancelled the request', () => {
    expect(copilotErrorMessage(new DOMException('aborted', 'AbortError'))).toBeNull()
  })

  it('explains an invalid plan with the reason the server gave in French', () => {
    expect(
      copilotErrorMessage(
        apiError(422, { code: 'plan-invalid', error: 'L’étape « envoi » est inconnue.' })
      )
    ).toEqual({ key: 'planInvalid', values: { detail: 'L’étape « envoi » est inconnue.' } })
  })

  it('passes on the reason the model gave for refusing', () => {
    expect(
      copilotErrorMessage(apiError(422, { code: 'rejected', error: 'contenu interdit' }))
    ).toEqual({ key: 'rejected', values: { reason: 'contenu interdit' } })
  })

  it('reports an unreachable model, with or without the code', () => {
    expect(copilotErrorMessage(apiError(503, { code: 'unavailable' }))?.key).toBe('unavailable')
    expect(copilotErrorMessage(apiError(503))?.key).toBe('unavailable')
  })

  it('asks the person to wait after too many requests', () => {
    expect(copilotErrorMessage(apiError(429, { error: 'Too many requests' }))?.key).toBe(
      'rateLimited'
    )
  })

  it('tells a member without write access, a missing folder and a locked folder apart', () => {
    expect(copilotErrorMessage(apiError(403))?.key).toBe('forbidden')
    expect(copilotErrorMessage(apiError(404))?.key).toBe('notFound')
    expect(copilotErrorMessage(apiError(423))?.key).toBe('locked')
  })

  it('never shows a raw English server message for an unexpected failure', () => {
    expect(copilotErrorMessage(apiError(500, { error: 'Internal Server Error' }))).toEqual({
      key: 'unknown',
    })
    expect(copilotErrorMessage(new TypeError('Failed to fetch'))).toEqual({ key: 'unknown' })
  })

  it('does not trust a 422 without a known code', () => {
    expect(copilotErrorMessage(apiError(422, { error: 'Validation failed' }))).toEqual({
      key: 'unknown',
    })
  })
})
