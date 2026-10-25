import { formatDate, formatDateTime } from '@sim/utils/formatting'
import type { Locale } from '@/lib/i18n/config'

/**
 * Nexora edition: `@sim/utils/formatting` writes dates in US English (« Oct 24, 2026 »). The
 * interface follows the member's language instead: French reads « 24 oct. 2026 » and a 24-hour
 * time; English keeps the original output, character for character.
 */
export function formatDateForLocale(date: Date, locale: Locale): string {
  // `Intl` throws on an invalid date where the original formatter returns « Invalid Date ».
  if (locale === 'en' || Number.isNaN(date.getTime())) return formatDate(date)
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

/** Date and time in the interface language, with the time zone's short name when one is given. */
export function formatDateTimeForLocale(date: Date, locale: Locale, timezone?: string): string {
  // The time zone name of an invalid date throws even in the original formatter: drop it.
  if (Number.isNaN(date.getTime())) return formatDateTime(date)
  if (locale === 'en') return formatDateTime(date, timezone)
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone || undefined,
    ...(timezone ? { timeZoneName: 'short' as const } : {}),
  }).format(date)
}
