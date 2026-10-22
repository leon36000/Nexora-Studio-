import { useCallback } from 'react'
import { toast } from '@sim/emcn'
import { createTranslator, type Messages, useTranslations } from 'next-intl'
import enShell from '@/messages/en/shell.json'

/** An item the batch reached but could not act on, with a reason worth showing. */
interface BulkFailure {
  name: string
  reason: string
}

/** An id that resolved to nothing active — deleted, or not visible to this user. */
interface BulkMissing {
  id: string
}

export interface BulkOutcome {
  failed: BulkFailure[]
  notFound: BulkMissing[]
}

/** The bulk operations whose partial outcome is reported. */
export type BulkVerb = 'moved' | 'deleted'

type Translate = (key: string, values?: Record<string, string | number>) => string

/**
 * Reports the parts of a bulk operation that did not happen.
 *
 * A bulk request succeeds as a whole while individual items are refused (a delete lock, a
 * folder cycle) or have vanished since the list was rendered. Those items are the difference
 * between what the user selected and what actually changed, so they have to be said out loud —
 * the list simply refetching leaves the user to notice a row survived.
 *
 * Success stays silent, matching the single-item move and delete paths.
 */
function reportBulkOutcomeWith(outcome: BulkOutcome, verb: BulkVerb, t: Translate): void {
  const { failed, notFound } = outcome

  if (failed.length > 0) {
    const [first] = failed
    toast.error(
      failed.length === 1
        ? t(`${verb}.single`, { name: first.name, reason: first.reason })
        : t(`${verb}.multiple`, { count: failed.length, name: first.name, reason: first.reason }),
      { duration: 5000 }
    )
    return
  }

  if (notFound.length > 0) {
    toast.error(
      notFound.length === 1
        ? t(`${verb}.missingOne`)
        : t(`${verb}.missingMany`, { count: notFound.length }),
      { duration: 5000 }
    )
  }
}

/** Translated {@link reportBulkOutcome} for client components. */
export function useReportBulkOutcome() {
  const t = useTranslations('shell.bulkOutcome')
  return useCallback(
    (outcome: BulkOutcome, verb: BulkVerb) => reportBulkOutcomeWith(outcome, verb, t),
    [t]
  )
}

const englishMessages: Messages = { shell: enShell }

const englishTranslate = createTranslator({
  locale: 'en',
  messages: englishMessages,
  namespace: 'shell.bulkOutcome',
})

/** English-only variant for callers outside React; prefer {@link useReportBulkOutcome}. */
export function reportBulkOutcome(outcome: BulkOutcome, verb: BulkVerb): void {
  reportBulkOutcomeWith(outcome, verb, englishTranslate)
}
