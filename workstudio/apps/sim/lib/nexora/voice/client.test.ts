/**
 * @vitest-environment node
 */
import { jsonResponse } from '@sim/testing/helpers/http'
import { describe, expect, it, vi } from 'vitest'
import { NexoraDocumentAiError } from '@/lib/nexora/document-ai/client'
import {
  MAX_SPEECH_CHARACTERS,
  nexoraSpeak,
  nexoraTranscribeDiarized,
} from '@/lib/nexora/voice/client'

const config = { baseUrl: 'http://nexora-api:8000/v1', apiKey: 'workstudio-key' }
const WAV = new Uint8Array([82, 73, 70, 70, 1, 2, 3, 4])

function api(handler: (url: string, init: RequestInit) => Response) {
  const calls: { url: string; init: RequestInit }[] = []
  const fetchFn = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} })
    return handler(String(input), init ?? {})
  })
  return { calls, options: { config, fetchFn: fetchFn as unknown as typeof fetch } }
}

describe('nexoraSpeak', () => {
  it('asks the speech model for a WAV and returns the audio bytes with their type', async () => {
    const { calls, options } = api(
      () => new Response(WAV, { headers: { 'Content-Type': 'audio/wav' } })
    )

    const spoken = await nexoraSpeak({ text: 'Bonjour à tous', model: 'piper-fr' }, options)

    expect(calls[0].url).toBe('http://nexora-api:8000/v1/audio/speech')
    expect(new Headers(calls[0].init.headers).get('Authorization')).toBe('Bearer workstudio-key')
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      model: 'piper-fr',
      input: 'Bonjour à tous',
      voice: 'default',
      response_format: 'wav',
    })
    expect([...spoken.audio]).toEqual([...WAV])
    expect(spoken.mimeType).toBe('audio/wav')
  })

  it('sends the voice, the format and the speed that were asked for', async () => {
    const { calls, options } = api(
      () => new Response(WAV, { headers: { 'Content-Type': 'audio/mpeg' } })
    )

    await nexoraSpeak(
      { text: 'Salut', model: 'piper-fr', voice: 'siwis', format: 'mp3', speed: 1.25 },
      options
    )

    expect(JSON.parse(String(calls[0].init.body))).toMatchObject({
      voice: 'siwis',
      response_format: 'mp3',
      speed: 1.25,
    })
  })

  it('refuses an empty text, and a text over the API limit, before calling anything', async () => {
    const { calls, options } = api(() => new Response(WAV))

    await expect(nexoraSpeak({ text: '   ', model: 'm' }, options)).rejects.toMatchObject({
      code: 'refused',
    })
    await expect(
      nexoraSpeak({ text: 'x'.repeat(MAX_SPEECH_CHARACTERS + 1), model: 'm' }, options)
    ).rejects.toMatchObject({ code: 'refused' })
    expect(calls).toHaveLength(0)
  })

  it('reports a model that is not served as « no model », and an unreachable API as unavailable', async () => {
    const missing = api(() => jsonResponse({ detail: 'Model piper not found.' }, 404))
    await expect(
      nexoraSpeak({ text: 'Bonjour', model: 'piper' }, missing.options)
    ).rejects.toMatchObject({
      code: 'no-model',
    })

    const down = api(() => {
      throw new TypeError('fetch failed')
    })
    await expect(
      nexoraSpeak({ text: 'Bonjour', model: 'piper' }, down.options)
    ).rejects.toBeInstanceOf(NexoraDocumentAiError)
    await expect(
      nexoraSpeak({ text: 'Bonjour', model: 'piper' }, down.options)
    ).rejects.toMatchObject({
      code: 'unavailable',
    })
  })

  it('refuses an answer that is not audio', async () => {
    const { options } = api(() => jsonResponse({ oops: true }))
    await expect(nexoraSpeak({ text: 'Bonjour', model: 'piper' }, options)).rejects.toMatchObject({
      code: 'unavailable',
    })
  })
})

describe('nexoraTranscribeDiarized', () => {
  const input = {
    audio: Buffer.from('audio'),
    fileName: 'reunion.mp3',
    mimeType: 'audio/mpeg',
    model: 'whisper-small',
    language: 'fr',
    prompt: 'Vocabulaire : Nexora.',
  }

  it('asks for the speakers and returns the segments with their speaker', async () => {
    const { calls, options } = api(() =>
      jsonResponse({
        text: 'Bonjour Salut',
        segments: [
          { id: 0, text: 'Bonjour', start: 0, end: 0.5, speaker: 'speaker_1' },
          { id: 1, text: 'Salut', start: 3, end: 3.5, speaker: 'speaker_2' },
        ],
      })
    )

    const result = await nexoraTranscribeDiarized({ ...input, numSpeakers: 2 }, options)

    const form = calls[0].init.body as FormData
    expect(form.get('response_format')).toBe('diarized_json')
    expect(form.get('num_speakers')).toBe('2')
    expect(form.get('prompt')).toBe('Vocabulaire : Nexora.')
    expect(form.get('language')).toBe('fr')
    expect(result.text).toBe('Bonjour Salut')
    expect(result.segments).toEqual([
      { speaker: 'speaker_1', start: 0, end: 0.5, text: 'Bonjour' },
      { speaker: 'speaker_2', start: 3, end: 3.5, text: 'Salut' },
    ])
  })

  it('does not send a speaker count that was not given', async () => {
    const { calls, options } = api(() => jsonResponse({ text: '', segments: [] }))
    await nexoraTranscribeDiarized(input, options)
    expect((calls[0].init.body as FormData).has('num_speakers')).toBe(false)
  })

  it('says clearly that the speakers are not available when the instance has no diarization service', async () => {
    const { options } = api(() =>
      jsonResponse({ detail: 'Speaker diarization is not available: no service.' }, 501)
    )
    await expect(nexoraTranscribeDiarized(input, options)).rejects.toMatchObject({
      code: 'diarization-unavailable',
    })
  })

  it('drops a segment without text or time instead of failing the whole meeting', async () => {
    const { options } = api(() =>
      jsonResponse({
        text: 'Bonjour',
        segments: [
          { text: 'Bonjour', start: 0, end: 1, speaker: 'speaker_1' },
          { text: 'sans temps', speaker: 'speaker_1' },
          'bizarre',
        ],
      })
    )
    const result = await nexoraTranscribeDiarized(input, options)
    expect(result.segments.map((segment) => segment.text)).toEqual(['Bonjour'])
  })
})
