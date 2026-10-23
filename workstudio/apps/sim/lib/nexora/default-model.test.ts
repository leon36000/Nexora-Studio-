import { jsonResponse } from '@sim/testing/helpers/http'
import { describe, expect, it, vi } from 'vitest'
import { fetchDefaultModelName } from '@/lib/nexora/default-model'

const config = { baseUrl: 'http://nexora-api:8000/v1', apiKey: 'workstudio-key' }

describe('fetchDefaultModelName', () => {
  it('names the model carrying the nexora-default alias', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({
        data: [
          { id: 'mistral-small-latest', aliases: [] },
          { id: 'qwen2.5:7b', aliases: ['nexora-default'] },
        ],
      })
    )
    expect(await fetchDefaultModelName({ config, fetchFn })).toBe('qwen2.5:7b')
    expect(fetchFn.mock.calls[0][0]).toBe('http://nexora-api:8000/v1/models')
  })

  it('answers null rather than failing when Nexora API is down, refuses, or has no default', async () => {
    const down = vi.fn().mockRejectedValue(new TypeError('fetch failed'))
    const refused = vi.fn().mockResolvedValue(jsonResponse({}, 401))
    const none = vi.fn().mockResolvedValue(jsonResponse({ data: [{ id: 'a', aliases: [] }] }))
    for (const fetchFn of [down, refused, none]) {
      expect(await fetchDefaultModelName({ config, fetchFn })).toBeNull()
    }
    expect(
      await fetchDefaultModelName({ config: { baseUrl: '', apiKey: '' }, fetchFn: none })
    ).toBeNull()
  })
})
