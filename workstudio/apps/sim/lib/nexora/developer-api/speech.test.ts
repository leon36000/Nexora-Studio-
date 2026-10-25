/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockAdmit, mockReserve, mockCallUpstream, settle, release } = vi.hoisted(() => ({
  mockAdmit: vi.fn(),
  mockReserve: vi.fn(),
  mockCallUpstream: vi.fn(),
  settle: vi.fn(),
  release: vi.fn(),
}))

vi.mock('@/lib/nexora/developer-api/gateway', () => ({
  admitModel: mockAdmit,
  reserveSpending: mockReserve,
}))
vi.mock('@/lib/nexora/developer-api/upstream', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/nexora/developer-api/upstream')>()),
  callUpstream: mockCallUpstream,
}))
vi.mock('@/lib/nexora/developer-api/agents', () => ({
  agentModelIds: vi.fn(),
  listApiAgents: vi.fn(),
}))

import type { GatewayCall } from '@/lib/nexora/developer-api/gateway'
import { relaySpeech } from '@/lib/nexora/developer-api/models'

const call = {
  key: { id: 'key-1', name: 'Clé de test', scope: 'workspace', workspaceId: 'ws-1' },
  headers: { 'x-ratelimit-remaining': '9' },
} as unknown as GatewayCall

const WAV = new Uint8Array([82, 73, 70, 70, 9, 9])

describe('relaySpeech', () => {
  beforeEach(() => {
    mockAdmit.mockResolvedValue('piper-fr-fr-siwis-medium')
    mockReserve.mockResolvedValue({
      estimate: { promptTokens: 12, completionTokens: 0 },
      settle,
      release,
    })
    mockCallUpstream.mockResolvedValue(
      new Response(WAV, { headers: { 'Content-Type': 'audio/wav' } })
    )
  })

  it('relays the text to the voice model and returns its audio unchanged, with its type', async () => {
    const response = await relaySpeech(
      call,
      { model: 'voix', input: 'Bonjour à tous', voice: 'siwis', response_format: 'wav' },
      new AbortController().signal
    )

    expect(mockAdmit).toHaveBeenCalledWith(call.key, 'voix')
    expect(mockCallUpstream).toHaveBeenCalledWith(
      '/audio/speech',
      expect.objectContaining({ method: 'POST', contentType: 'application/json' })
    )
    expect(JSON.parse(String(mockCallUpstream.mock.calls[0][1].body))).toEqual({
      model: 'voix',
      input: 'Bonjour à tous',
      voice: 'siwis',
      response_format: 'wav',
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('audio/wav')
    expect(response.headers.get('x-ratelimit-remaining')).toBe('9')
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(WAV)
  })

  it('counts the characters of the text as prompt tokens on the key, under the router name', async () => {
    await relaySpeech(call, { model: 'voix', input: 'x'.repeat(400) }, new AbortController().signal)

    expect(mockReserve.mock.calls[0][1]).toBe('piper-fr-fr-siwis-medium')
    expect(mockReserve.mock.calls[0][2].promptTokens).toBeGreaterThanOrEqual(100)
    expect(mockReserve.mock.calls[0][2].completionTokens).toBe(0)
    expect(settle).toHaveBeenCalledWith(
      expect.objectContaining({ promptTokens: expect.any(Number), completionTokens: 0 })
    )
  })

  it('releases the reservation when the voice model refuses, so the key is not charged', async () => {
    mockCallUpstream.mockResolvedValue(
      Response.json({ detail: 'Model voix not found.' }, { status: 404 })
    )

    await expect(
      relaySpeech(call, { model: 'voix', input: 'Bonjour' }, new AbortController().signal)
    ).rejects.toMatchObject({ status: 404 })
    expect(release).toHaveBeenCalledTimes(1)
    expect(settle).not.toHaveBeenCalled()
  })

  it('refuses a text over the 4 096 characters of the API, in French, before any call', async () => {
    await expect(
      relaySpeech(call, { model: 'voix', input: 'x'.repeat(4097) }, new AbortController().signal)
    ).rejects.toMatchObject({ status: 400, message: expect.stringContaining('4 096') })
    expect(mockCallUpstream).not.toHaveBeenCalled()
    expect(mockReserve).not.toHaveBeenCalled()
  })
})
