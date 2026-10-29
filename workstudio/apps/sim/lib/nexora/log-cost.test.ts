import { describe, expect, it } from 'vitest'
import { logCostCredits } from '@/lib/nexora/log-cost'

describe('logCostCredits', () => {
  it('converts the cost a run recorded into credits for an instance that has its own models', () => {
    expect(logCostCredits(0.5, false)).toBe(100)
    expect(logCostCredits(0, false)).toBe(0)
  })

  it('shows no figure for a person billed by the Nexora AI site: WorkStudio’s credits are not their wallet', () => {
    expect(logCostCredits(0.5, true)).toBeNull()
  })

  it('shows no figure for a run that recorded no cost', () => {
    expect(logCostCredits(undefined, false)).toBeNull()
    expect(logCostCredits('0.5', false)).toBeNull()
    expect(logCostCredits(Number.NaN, false)).toBeNull()
  })
})
