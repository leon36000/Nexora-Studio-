import { describe, expect, it } from 'vitest'
import { formatLogDuration } from '@/lib/nexora/duration'

const NBSP = ' '

describe('formatLogDuration', () => {
  it('writes French durations the way the traces page does: decimal comma, space before the unit', () => {
    expect(formatLogDuration(2620, 'fr')).toBe(`2,62${NBSP}s`)
    expect(formatLogDuration(747, 'fr')).toBe(`747${NBSP}ms`)
    expect(formatLogDuration(37, 'fr')).toBe(`37${NBSP}ms`)
    expect(formatLogDuration(5000, 'fr')).toBe(`5${NBSP}s`)
  })

  it('spells minutes and hours out in French', () => {
    expect(formatLogDuration(65_000, 'fr')).toBe(`1${NBSP}min 5${NBSP}s`)
    expect(formatLogDuration(3_725_000, 'fr')).toBe(`1${NBSP}h 2${NBSP}min`)
  })

  it('leaves the English wording as it was', () => {
    expect(formatLogDuration(2620, 'en')).toBe('2.62s')
    expect(formatLogDuration(65_000, 'en')).toBe('1m 5s')
  })

  it('keeps what the formatter answers for nothing or for a text it cannot read', () => {
    expect(formatLogDuration(undefined, 'fr')).toBeNull()
    expect(formatLogDuration(null, 'fr')).toBeNull()
    expect(formatLogDuration('en cours', 'fr')).toBe('en cours')
  })
})
