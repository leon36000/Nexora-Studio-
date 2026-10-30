import { describe, expect, it } from 'vitest'
import { logCostCredits, logTokensByExecution } from '@/lib/nexora/log-cost'

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

describe('logTokensByExecution', () => {
  it('reads each run’s tokens from the trace the run left, by execution id', () => {
    const tokens = logTokensByExecution([
      { executionId: 'a', inputTokens: 300, outputTokens: 120 },
      { executionId: 'b', inputTokens: 5, outputTokens: 0 },
    ])
    expect(tokens.get('a')).toEqual({ input: 300, output: 120, total: 420 })
    expect(tokens.get('b')).toEqual({ input: 5, output: 0, total: 5 })
    expect(tokens.get('c')).toBeUndefined()
  })

  it('ignores a trace with no execution (an assistant message, a playground run)', () => {
    const tokens = logTokensByExecution([{ executionId: null, inputTokens: 10, outputTokens: 10 }])
    expect(tokens.size).toBe(0)
  })

  it('knows nothing before the traces have arrived', () => {
    expect(logTokensByExecution(undefined).size).toBe(0)
  })
})
