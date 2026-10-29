import { toStringOrNull } from '@sim/utils/coerce'
import { toRecord, toRecordOrNull } from '@sim/utils/object'
import { truncate } from '@sim/utils/string'
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

/** The text a run produced: the final Agent's `content`, or a plain string output. */
export function outputText(output: unknown): string {
  if (typeof output === 'string') return output.trim()
  const content = toRecordOrNull(output)?.content
  return typeof content === 'string' ? content.trim() : ''
}

const MAX_FAILURE_REASON_LENGTH = 300

/** The reason a failed run reported, short, `null` when it reported none. */
export function runFailureReason(result: unknown): string | null {
  const reason = toStringOrNull(toRecord(result).error)?.trim()
  return reason ? truncate(reason, MAX_FAILURE_REASON_LENGTH - 1, '…') : null
}
