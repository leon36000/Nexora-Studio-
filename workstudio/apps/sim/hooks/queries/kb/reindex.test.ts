/**
 * The reindex banner keeps asking for news while a reindex runs, slowly once it stalls: a stalled
 * reindex is often only waiting for the model server, and moves again on its own.
 */
import { describe, expect, it } from 'vitest'
import { reindexPollInterval } from '@/hooks/queries/kb/reindex'

describe('reindexPollInterval', () => {
  it('refreshes every few seconds while the reindex moves', () => {
    expect(reindexPollInterval({ status: 'running', stalled: false })).toBeLessThanOrEqual(5_000)
  })

  it('keeps refreshing, slowly, while the reindex looks stalled', () => {
    const interval = reindexPollInterval({ status: 'running', stalled: true })
    expect(interval).not.toBe(false)
    expect(interval).toBeGreaterThanOrEqual(30_000)
  })

  it('stops once the reindex is over', () => {
    expect(reindexPollInterval({ status: 'completed', stalled: false })).toBe(false)
    expect(reindexPollInterval({ status: 'failed', stalled: false })).toBe(false)
    expect(reindexPollInterval(null)).toBe(false)
  })
})
