import { describe, expect, it, vi } from 'vitest'
import {
  instanceTimeZone,
  monthWindow,
  periodDays,
  periodWindow,
} from '@/lib/nexora/consumption/period'

describe('monthWindow', () => {
  it('puts the last evening of October in Paris into November once midnight has passed there', () => {
    const window = monthWindow(new Date('2026-10-31T23:30:00Z'), 'Europe/Paris')
    expect(window.month).toBe('2026-11')
    expect(window.start.toISOString()).toBe('2026-10-31T23:00:00.000Z')
    expect(window.end.toISOString()).toBe('2026-11-30T23:00:00.000Z')
  })

  it('keeps the same instant in October for an instance on UTC', () => {
    const window = monthWindow(new Date('2026-10-31T23:30:00Z'), 'UTC')
    expect(window.month).toBe('2026-10')
    expect(window.start.toISOString()).toBe('2026-10-01T00:00:00.000Z')
    expect(window.end.toISOString()).toBe('2026-11-01T00:00:00.000Z')
  })

  it('starts a summer month at local midnight across the daylight-saving change', () => {
    const window = monthWindow(new Date('2026-10-10T12:00:00Z'), 'Europe/Paris')
    expect(window.start.toISOString()).toBe('2026-09-30T22:00:00.000Z')
    expect(window.end.toISOString()).toBe('2026-10-31T23:00:00.000Z')
  })

  it('rolls December over into the next year', () => {
    const window = monthWindow(new Date('2026-12-31T23:30:00Z'), 'Europe/Paris')
    expect(window.month).toBe('2027-01')
    expect(window.end.toISOString()).toBe('2027-01-31T23:00:00.000Z')
  })
})

describe('instanceTimeZone', () => {
  it('follows NEXORA_TIME_ZONE', () => {
    vi.stubEnv('NEXORA_TIME_ZONE', 'America/Martinique')
    expect(instanceTimeZone()).toBe('America/Martinique')
  })

  it('falls back to Paris when the variable is missing or not a time zone', () => {
    vi.stubEnv('NEXORA_TIME_ZONE', '')
    expect(instanceTimeZone()).toBe('Europe/Paris')
    vi.stubEnv('NEXORA_TIME_ZONE', 'Mars/Olympus')
    expect(instanceTimeZone()).toBe('Europe/Paris')
  })
})

describe('periodWindow', () => {
  it('covers today and the previous local days, from local midnight to now', () => {
    const now = new Date('2026-10-23T09:15:00Z')
    const window = periodWindow(now, 7, 'Europe/Paris')
    expect(window.start.toISOString()).toBe('2026-10-16T22:00:00.000Z')
    expect(window.end).toEqual(now)
  })

  it('starts the day in the instance time zone, not in UTC, just after local midnight', () => {
    const window = periodWindow(new Date('2026-10-22T22:30:00Z'), 1, 'Europe/Paris')
    expect(window.start.toISOString()).toBe('2026-10-22T22:00:00.000Z')
  })

  it('starts at local midnight before a daylight-saving change inside the period', () => {
    const window = periodWindow(new Date('2026-11-02T10:00:00Z'), 7, 'Europe/Paris')
    expect(window.start.toISOString()).toBe('2026-10-26T23:00:00.000Z')
    const summer = periodWindow(new Date('2026-10-26T10:00:00Z'), 7, 'Europe/Paris')
    expect(summer.start.toISOString()).toBe('2026-10-19T22:00:00.000Z')
  })
})

describe('periodDays', () => {
  it('lists every local day of the period, oldest first, across a month end', () => {
    expect(periodDays(new Date('2026-11-02T10:00:00Z'), 4, 'Europe/Paris')).toEqual([
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
    ])
  })

  it('names today after the local date, which is already tomorrow in UTC terms', () => {
    expect(periodDays(new Date('2026-12-31T23:30:00Z'), 2, 'Europe/Paris')).toEqual([
      '2026-12-31',
      '2027-01-01',
    ])
  })
})
