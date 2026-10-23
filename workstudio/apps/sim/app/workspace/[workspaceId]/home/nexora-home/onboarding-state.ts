import { isApiClientError } from '@/lib/api/client/errors'
import type { OnboardingStep } from '@/lib/nexora/onboarding-steps'

interface OnboardingProgress {
  completed: readonly OnboardingStep[]
  dismissed: boolean
}

/**
 * « Reprendre le premier lancement » is offered only for a first launch put off with « Plus tard »:
 * once the first result is in, the first launch is over and there is nothing left to resume.
 */
export function shouldOfferResume(onboarding: OnboardingProgress | null): boolean {
  if (!onboarding?.dismissed) return false
  return !onboarding.completed.includes('first-run')
}

export type QuoteFailureKind = 'timeout' | 'forbidden' | 'generic'

const TIMEOUT_STATUSES = new Set([408, 504])

/**
 * Which French message explains a failed sample quote. The raw error text comes from the
 * executor in English, so only the HTTP status is read; `null` is a run that reported its own
 * failure.
 */
export function quoteFailureKind(error: unknown): QuoteFailureKind {
  if (!isApiClientError(error)) return 'generic'
  if (TIMEOUT_STATUSES.has(error.status)) return 'timeout'
  if (error.status === 403) return 'forbidden'
  return 'generic'
}
