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

/** The local calendar date `offset` days from `now`'s, `YYYY-MM-DD` in `timeZone`. */
function localDate(now: Date, offset: number, timeZone: string): string {
  const { year, month, day } = getWallClockParts(now, timeZone)
  return new Date(Date.UTC(year, month - 1, day + offset)).toISOString().slice(0, 10)
}

/**
 * The last `days` local days in `timeZone`, today included: from local midnight `days - 1` days
 * ago until `now`.
 */
export function periodWindow(
  now: Date,
  days: number,
  timeZone: string
): { start: Date; end: Date } {
  return {
    start: zonedWallClockToUtc(`${localDate(now, 1 - days, timeZone)}T00:00`, timeZone),
    end: now,
  }
}

/** Every local day of {@link periodWindow}, oldest first, as `YYYY-MM-DD`. */
export function periodDays(now: Date, days: number, timeZone: string): string[] {
  return Array.from({ length: days }, (_, index) => localDate(now, index + 1 - days, timeZone))
}
