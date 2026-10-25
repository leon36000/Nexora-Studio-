import { describe, expect, it } from 'vitest'
import {
  formatTokenCount,
  formatTps,
} from '@/app/workspace/[workspaceId]/logs/components/log-details/utils'

describe('formatTokenCount', () => {
  it('groups thousands the French way in French', () => {
    expect(formatTokenCount(12345, 'fr')).toMatch(/^12\s345$/)
  })

  it('keeps the original English grouping', () => {
    expect(formatTokenCount(12345)).toBe('12,345')
    expect(formatTokenCount(12345, 'en')).toBe('12,345')
  })

  it('hides an empty count', () => {
    expect(formatTokenCount(0, 'fr')).toBeUndefined()
  })
})

describe('formatTps', () => {
  it('groups thousands the French way in French', () => {
    expect(formatTps(5000, 1000, 'fr')).toMatch(/^5\s000 tok\/s$/)
  })

  it('keeps the original English grouping', () => {
    expect(formatTps(5000, 1000)).toBe('5,000 tok/s')
  })
})
