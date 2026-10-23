import { getWallClockParts, isValidTimezone, zonedWallClockToUtc } from '@/lib/core/utils/timezone'

const DEFAULT_TIME_ZONE = 'Europe/Paris'

/**
 * The instance's time zone (`NEXORA_TIME_ZONE`, the one dates render in), which sets where a
 * day and a budget month begin. Read like `i18n/request.ts` does, so both agree.
 */
export function instanceTimeZone(): string {
  const configured = process.env.NEXORA_TIME_ZONE?.trim()
  return configured && isValidTimezone(configured) ? configured : DEFAULT_TIME_ZONE
}

export interface MonthWindow {
  /** `YYYY-MM`, the local calendar month. */
  month: string
  /** Local midnight on the 1st, as a UTC instant. */
  start: Date
  /** Local midnight on the 1st of the next month (exclusive). */
  end: Date
}

function firstOfMonth(year: number, month: number, timeZone: string): Date {
  return zonedWallClockToUtc(`${year}-${String(month).padStart(2, '0')}-01T00:00`, timeZone)
}

/** The local calendar month containing `now` in `timeZone`. */
export function monthWindow(now: Date, timeZone: string): MonthWindow {
  const { year, month } = getWallClockParts(now, timeZone)
  const nextYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  return {
    month: `${year}-${String(month).padStart(2, '0')}`,
    start: firstOfMonth(year, month, timeZone),
    end: firstOfMonth(nextYear, nextMonth, timeZone),
  }
}
