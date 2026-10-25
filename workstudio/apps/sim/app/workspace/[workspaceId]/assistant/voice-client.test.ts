/**
 * @vitest-environment node
 */
import { jsonResponse } from '@sim/testing/helpers/http'
import { describe, expect, it, vi } from 'vitest'
import {
  dictateRecording,
  speakPiece,
  VoiceError,
} from '@/app/workspace/[workspaceId]/assistant/voice-client'

const signal = new AbortController().signal

describe('dictateRecording', () => {
  it('sends the recording with the workspace and the language, and returns the text', async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ text: 'Bonjour Marie.' }))
    const recording = new Blob([new Uint8Array(4096)], { type: 'audio/webm' })

    const text = await dictateRecording({
      workspaceId: 'ws-1',
      recording,
      language: 'fr',
      signal,
      fetchFn: fetchFn as unknown as typeof fetch,
    })

    expect(text).toBe('Bonjour Marie.')
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/nexora/assistant/voice/dictate')
    const form = init.body as FormData
    expect(form.get('workspaceId')).toBe('ws-1')
    expect(form.get('language')).toBe('fr')
    expect((form.get('file') as File).type).toBe('audio/webm')
  })

  it('says a recording with nothing in it is empty, without calling the server', async () => {
    const fetchFn = vi.fn()
    await expect(
      dictateRecording({
        workspaceId: 'ws-1',
        recording: new Blob([]),
        language: 'fr',
        signal,
        fetchFn: fetchFn as unknown as typeof fetch,
      })
    ).rejects.toMatchObject({ code: 'empty' })
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('says a silence (no words found) is empty too, rather than inserting nothing quietly', async () => {
    const fetchFn = async () => jsonResponse({ text: '   ' })
    await expect(
      dictateRecording({
        workspaceId: 'ws-1',
        recording: new Blob([new Uint8Array(4096)], { type: 'audio/webm' }),
        language: 'fr',
        signal,
        fetchFn: fetchFn as unknown as typeof fetch,
      })
    ).rejects.toMatchObject({ code: 'empty' })
  })

  it.each([
    [400, { error: 'no-model' }, 'no-model'],
    [502, { error: 'unavailable' }, 'unavailable'],
    [413, { error: 'too-long' }, 'too-long'],
    [500, {}, 'unavailable'],
    [403, { error: 'Forbidden' }, 'failed'],
  ])('maps a %s answer %j to the code %s the page words in French', async (status, body, code) => {
    const fetchFn = async () => jsonResponse(body, status)
    await expect(
      dictateRecording({
        workspaceId: 'ws-1',
        recording: new Blob([new Uint8Array(4096)], { type: 'audio/webm' }),
        language: 'fr',
        signal,
        fetchFn: fetchFn as unknown as typeof fetch,
      })
    ).rejects.toEqual(expect.objectContaining({ code }))
  })

  it('reports an unreachable server as unavailable', async () => {
    const fetchFn = async () => {
      throw new TypeError('fetch failed')
    }
    await expect(
      dictateRecording({
        workspaceId: 'ws-1',
        recording: new Blob([new Uint8Array(4096)], { type: 'audio/webm' }),
        language: 'fr',
        signal,
        fetchFn: fetchFn as unknown as typeof fetch,
      })
    ).rejects.toBeInstanceOf(VoiceError)
  })
})

describe('speakPiece', () => {
  it('returns the audio of a piece of text as a blob of its type', async () => {
    const fetchFn = vi.fn(
      async () =>
        new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'audio/wav' } })
    )

    const audio = await speakPiece({
      workspaceId: 'ws-1',
      text: 'Bonjour.',
      signal,
      fetchFn: fetchFn as unknown as typeof fetch,
    })

    expect(audio.type).toBe('audio/wav')
    expect(audio.size).toBe(3)
    const [, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toEqual({ workspaceId: 'ws-1', text: 'Bonjour.' })
  })

  it('maps a refusal to a code', async () => {
    const fetchFn = async () => jsonResponse({ error: 'no-model' }, 400)
    await expect(
      speakPiece({
        workspaceId: 'ws-1',
        text: 'Bonjour.',
        signal,
        fetchFn: fetchFn as unknown as typeof fetch,
      })
    ).rejects.toMatchObject({ code: 'no-model' })
  })
})
