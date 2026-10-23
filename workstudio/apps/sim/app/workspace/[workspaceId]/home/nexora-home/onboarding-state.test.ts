import { describe, expect, it } from 'vitest'
import { ApiClientError } from '@/lib/api/client/errors'
import {
  quoteFailureKind,
  shouldOfferResume,
} from '@/app/workspace/[workspaceId]/home/nexora-home/onboarding-state'

function apiError(status: number) {
  return new ApiClientError({ status, message: 'Request timed out', body: null })
}

describe('shouldOfferResume', () => {
  it('offers nothing to a member who has no first-launch progress', () => {
    expect(shouldOfferResume(null)).toBe(false)
  })

  it('offers nothing while the panel is still on screen', () => {
    expect(shouldOfferResume({ completed: [], dismissed: false })).toBe(false)
  })

  it('offers to resume a first launch put off with « Plus tard »', () => {
    expect(shouldOfferResume({ completed: ['organization'], dismissed: true })).toBe(true)
  })

  it('stops offering once the first result ended the first launch', () => {
    expect(shouldOfferResume({ completed: ['first-run'], dismissed: true })).toBe(false)
  })
})

describe('quoteFailureKind', () => {
  it.each([408, 504])('reads %i as the model taking too long', (status) => {
    expect(quoteFailureKind(apiError(status))).toBe('timeout')
  })

  it('reads 403 as missing rights', () => {
    expect(quoteFailureKind(apiError(403))).toBe('forbidden')
  })

  it.each([
    ['a server error', apiError(500)],
    ['a network error', new TypeError('Failed to fetch')],
    ['a run that reported its own failure', null],
  ])('falls back to the generic message for %s', (_case, error) => {
    expect(quoteFailureKind(error)).toBe('generic')
  })
})
