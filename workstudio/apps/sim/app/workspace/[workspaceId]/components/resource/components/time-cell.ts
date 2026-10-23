import { useCallback } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { ResourceCell } from '@/app/workspace/[workspaceId]/components/resource/resource'

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

type Translate = (key: string, values?: Record<string, string | number>) => string

function formatFullDate(date: Date, t: Translate, locale: string): string {
  return t('fullDate', {
    month: new Intl.DateTimeFormat(locale, { month: 'long' }).format(date),
    day: date.getDate(),
    year: String(date.getFullYear()),
  })
}

/**
 * Formats a date string into a human-friendly relative time label.
 *
 * - Within ~1 minute of now: "Now"
 * - Under 1 hour: "X minute(s) ago" / "X minute(s)"
 * - Under 24 hours: "X hour(s) ago" / "X hour(s)"
 * - Under 2 days: "X day(s) ago" / "X day(s)"
 * - Beyond 2 days: full date (e.g. "March 4th, 2026")
 */
export function formatTimeCell(
  dateValue: string | Date | null | undefined,
  t: Translate,
  locale: string
): ResourceCell {
  if (!dateValue) return { label: null }

  const date = dateValue instanceof Date ? dateValue : new Date(dateValue)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const absDiff = Math.abs(diff)
  const isPast = diff > 0

  if (absDiff < MINUTE) return { label: t('now') }

  if (absDiff < HOUR) {
    const count = Math.floor(absDiff / MINUTE)
    return { label: t(isPast ? 'minutesAgo' : 'minutes', { count }) }
  }

  if (absDiff < DAY) {
    const count = Math.floor(absDiff / HOUR)
    return { label: t(isPast ? 'hoursAgo' : 'hours', { count }) }
  }

  if (absDiff < 2 * DAY) {
    const count = Math.floor(absDiff / DAY)
    return { label: t(isPast ? 'daysAgo' : 'days', { count }) }
  }

  return { label: formatFullDate(date, t, locale) }
}

/**
 * The resource lists' date cell in the interface language: « Maintenant », « Il y a 5 minutes »,
 * « 4 mars 2026 »… Stable while the language does not change, so row builders can depend on it.
 */
export function useTimeCell(): (dateValue: string | Date | null | undefined) => ResourceCell {
  const t = useTranslations('shell.timeCell')
  const locale = useLocale()
  return useCallback((dateValue) => formatTimeCell(dateValue, t, locale), [t, locale])
}
