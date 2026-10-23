import { jsonResponse } from '@sim/testing/helpers/http'
import { describe, expect, it, vi } from 'vitest'
import { fetchConsumptionByModel } from '@/lib/nexora/consumption/by-model'
import { NexoraUsageUnavailableError } from '@/lib/nexora/usage'

const config = { baseUrl: 'http://nexora-api:8000/v1', apiKey: 'workstudio-key' }
const START = new Date('2026-10-01T00:00:00Z')
const END = new Date('2026-10-23T00:00:00Z')

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

const MODELS = {
  object: 'list',
  data: [
    { id: 'mistral-small', type: 'text-generation', aliases: ['nexora-default'] },
    { id: 'bge-m3', type: 'text-embeddings-inference', aliases: [] },
  ],
}

/** Answers `/models`, then each model's usage pages from `pages[model]` by offset. */
function nexoraApi(pages: Record<string, { total: number; data: unknown[] }[]>) {
  return vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/models')) return jsonResponse(MODELS)
    const model = url.searchParams.get('model') ?? ''
    const offset = Number(url.searchParams.get('offset'))
    const modelPages = pages[model] ?? [{ total: 0, data: [] }]
    let seen = 0
    for (const page of modelPages) {
      if (seen === offset) return jsonResponse({ object: 'list', offset, limit: 100, ...page })
      seen += page.data.length
    }
    return jsonResponse({ object: 'list', offset, limit: 100, total: seen, data: [] })
  })
}

describe('fetchConsumptionByModel', () => {
  it('asks Nexora API for each served model over the period with the WorkStudio key', async () => {
    const fetchFn = nexoraApi({})
    await fetchConsumptionByModel({ start: START, end: END, config, fetchFn })
    const usageCalls = fetchFn.mock.calls
      .map(([input]) => new URL(String(input)))
      .filter((url) => url.pathname.endsWith('/me/usage'))
    expect(usageCalls.map((url) => url.searchParams.get('model')).sort()).toEqual([
      'bge-m3',
      'mistral-small',
    ])
    expect(Number(usageCalls[0].searchParams.get('start_time'))).toBe(START.getTime() / 1000)
    expect(Number(usageCalls[0].searchParams.get('end_time'))).toBe(END.getTime() / 1000)
    for (const [, init] of fetchFn.mock.calls) {
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer workstudio-key')
    }
  })

  it('sums every page of a model, not only the first hundred days', async () => {
    const firstPage = Array.from({ length: 100 }, (_, i) => bucket((i % 28) + 1, 10, 5, 1))
    const fetchFn = nexoraApi({
      'mistral-small': [
        { total: 102, data: firstPage },
        { total: 102, data: [bucket(1, 1000, 500, 4), bucket(2, 0, 0, 0)] },
      ],
    })
    const models = await fetchConsumptionByModel({ start: START, end: END, config, fetchFn })
    const mistral = models.find((m) => m.model === 'mistral-small')
    expect(mistral).toMatchObject({
      requests: 104,
      promptTokens: 2000,
      completionTokens: 1000,
      totalTokens: 3000,
    })
    expect(mistral?.kgCO2eq).toBeCloseTo(0.204, 9)
    expect(mistral?.kWh).toBeCloseTo(1.02, 9)
  })

  it('keeps the aliases so WorkStudio names like nexora-default can be matched', async () => {
    const models = await fetchConsumptionByModel({
      start: START,
      end: END,
      config,
      fetchFn: nexoraApi({}),
    })
    expect(models.find((m) => m.model === 'mistral-small')?.aliases).toEqual(['nexora-default'])
  })

  it('reports Nexora API as unavailable when it is not configured', async () => {
    await expect(
      fetchConsumptionByModel({ start: START, end: END, config: null, fetchFn: vi.fn() })
    ).rejects.toBeInstanceOf(NexoraUsageUnavailableError)
  })

  it('reports Nexora API as unavailable rather than partial figures when one model fails', async () => {
    const healthy = nexoraApi({ 'mistral-small': [{ total: 1, data: [bucket(1, 10, 5, 1)] }] })
    const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
      new URL(String(input)).searchParams.get('model') === 'bge-m3'
        ? jsonResponse({ detail: 'boom' }, 500)
        : healthy(input, init)
    )
    await expect(
      fetchConsumptionByModel({ start: START, end: END, config, fetchFn })
    ).rejects.toBeInstanceOf(NexoraUsageUnavailableError)
  })

  it('reports Nexora API as unavailable when the model list cannot be read', async () => {
    await expect(
      fetchConsumptionByModel({
        start: START,
        end: END,
        config,
        fetchFn: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      })
    ).rejects.toBeInstanceOf(NexoraUsageUnavailableError)
  })
})
