import { jsonResponse } from '@sim/testing/helpers/http'
import { describe, expect, it, vi } from 'vitest'
import { fetchNexoraApiUsage, NexoraUsageUnavailableError } from '@/lib/nexora/usage'

const NOW = new Date('2026-10-22T12:00:00Z')
const config = { baseUrl: 'http://nexora-api:8000/v1', apiKey: 'workstudio-key' }

function bucket(day: number, prompt: number, completion: number, requests: number) {
  const start = Date.UTC(2026, 9, day) / 1000
  return {
    object: 'usage.bucket',
    start_time: start,
    end_time: start + 86400,
    prompt_tokens: prompt,
    completion_tokens: completion,
    total_tokens: prompt + completion,
    cost: 0,
    requests,
    impacts: { kWh: 0.01, kgCO2eq: 0.002 },
  }
}

describe('fetchNexoraApiUsage', () => {
  it('asks Nexora API for the period with the WorkStudio key', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ data: [], total: 0 }))
    await fetchNexoraApiUsage({ days: 30, now: NOW, config, fetchFn })
    const [url, init] = fetchFn.mock.calls[0]
    const parsed = new URL(url)
    expect(parsed.origin + parsed.pathname).toBe('http://nexora-api:8000/v1/me/usage')
    expect(Number(parsed.searchParams.get('end_time'))).toBe(NOW.getTime() / 1000)
    expect(Number(parsed.searchParams.get('start_time'))).toBe(NOW.getTime() / 1000 - 30 * 86400)
    expect(init.headers.Authorization).toBe('Bearer workstudio-key')
  })

  it('sums the daily buckets and keeps them newest first', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: [bucket(20, 100, 50, 2), bucket(21, 300, 200, 3)] }))
    const usage = await fetchNexoraApiUsage({ days: 30, now: NOW, config, fetchFn })
    expect(usage.totals).toEqual({
      requests: 5,
      promptTokens: 400,
      completionTokens: 250,
      totalTokens: 650,
      kgCO2eq: 0.004,
    })
    expect(usage.days.map((d) => d.date)).toEqual(['2026-10-21', '2026-10-20'])
  })

  it('reports Nexora API as unavailable when it is not configured', async () => {
    await expect(
      fetchNexoraApiUsage({ days: 30, now: NOW, config: null, fetchFn: vi.fn() })
    ).rejects.toBeInstanceOf(NexoraUsageUnavailableError)
  })

  it('reports Nexora API as unavailable on an error answer or a network failure', async () => {
    await expect(
      fetchNexoraApiUsage({
        days: 30,
        now: NOW,
        config,
        fetchFn: vi.fn().mockResolvedValue(jsonResponse({}, 401)),
      })
    ).rejects.toBeInstanceOf(NexoraUsageUnavailableError)
    await expect(
      fetchNexoraApiUsage({
        days: 30,
        now: NOW,
        config,
        fetchFn: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      })
    ).rejects.toBeInstanceOf(NexoraUsageUnavailableError)
  })
})
