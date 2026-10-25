/**
 * @vitest-environment node
 */
import { formatDate, formatDateTime } from '@sim/utils/formatting'
import { describe, expect, it } from 'vitest'
import { formatDateForLocale, formatDateTimeForLocale } from '@/lib/i18n/dates'

const NOON = new Date('2026-10-24T12:00:00Z')

describe('formatDateForLocale', () => {
  it('writes the date the French way', () => {
    expect(formatDateForLocale(NOON, 'fr')).toBe('24 oct. 2026')
  })

  it('keeps the original English date', () => {
    expect(formatDateForLocale(NOON, 'en')).toBe(formatDate(NOON))
    expect(formatDateForLocale(NOON, 'en')).toBe('Oct 24, 2026')
  })
})

describe('invalid dates', () => {
  it('never throw, whatever the language or the time zone', () => {
    const invalid = new Date('not a date')
    expect(() => formatDateForLocale(invalid, 'fr')).not.toThrow()
    expect(() => formatDateTimeForLocale(invalid, 'fr', 'Europe/Paris')).not.toThrow()
    expect(() => formatDateTimeForLocale(invalid, 'en', 'Europe/Paris')).not.toThrow()
  })
})

describe('formatDateTimeForLocale', () => {
  it('writes day, month, year and the 24-hour time in French', () => {
    const text = formatDateTimeForLocale(NOON, 'fr', 'Europe/Paris')
    expect(text).toContain('24 oct. 2026')
    expect(text).toContain('14:00')
    expect(text).not.toMatch(/AM|PM|Oct 24/)
  })

  it('names the time zone the French way', () => {
    expect(formatDateTimeForLocale(NOON, 'fr', 'Europe/Paris')).toMatch(/UTC\+2|CEST|GMT\+2/)
  })

  it('works without a time zone', () => {
    expect(formatDateTimeForLocale(NOON, 'fr')).toContain('2026')
  })

  it('keeps the original English date and time', () => {
    expect(formatDateTimeForLocale(NOON, 'en', 'America/New_York')).toBe(
      formatDateTime(NOON, 'America/New_York')
    )
    expect(formatDateTimeForLocale(NOON, 'en')).toBe(formatDateTime(NOON))
  })
})
