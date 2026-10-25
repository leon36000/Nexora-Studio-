import { jsonResponse } from '@sim/testing/helpers/http'
import { describe, expect, it, vi } from 'vitest'
import { fetchModelStatus } from '@/lib/nexora/default-model'

const config = { baseUrl: 'http://nexora-api:8000/v1', apiKey: 'workstudio-key' }

describe('fetchModelStatus', () => {
  it('names the model carrying the nexora-default alias', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({
        data: [
          { id: 'mistral-small-latest', aliases: [] },
          { id: 'qwen2.5:7b', aliases: ['nexora-default'] },
        ],
      })
    )
    expect((await fetchModelStatus({ config, fetchFn })).defaultModel).toBe('qwen2.5:7b')
    expect(fetchFn.mock.calls[0][0]).toBe('http://nexora-api:8000/v1/models')
  })

  it('says which usages have a model, from the same list', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({
        data: [
          { id: 'qwen2.5:7b', type: 'text-generation', aliases: ['nexora-default'] },
          { id: 'whisper-small', type: 'automatic-speech-recognition', aliases: [] },
        ],
      })
    )
    expect((await fetchModelStatus({ config, fetchFn })).usages).toEqual({
      chat: true,
      vision: false,
      transcription: true,
      speech: false,
    })
  })

  it('knows the usages even without a default model', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: [{ id: 'ocr', type: 'image-to-text' }] }))
    expect(await fetchModelStatus({ config, fetchFn })).toEqual({
      defaultModel: null,
      usages: { chat: false, vision: true, transcription: false, speech: false },
    })
  })

  it('answers unknown rather than failing when Nexora API is down, refuses, or is not configured', async () => {
    const unknown = { defaultModel: null, usages: null }
    const down = vi.fn().mockRejectedValue(new TypeError('fetch failed'))
    const refused = vi.fn().mockResolvedValue(jsonResponse({}, 401))
    const garbled = vi.fn().mockResolvedValue(jsonResponse({ data: 'nope' }))
    for (const fetchFn of [down, refused, garbled]) {
      expect(await fetchModelStatus({ config, fetchFn })).toEqual(unknown)
    }
    expect(
      await fetchModelStatus({ config: { baseUrl: '', apiKey: '' }, fetchFn: refused })
    ).toEqual(unknown)
  })
})
