import { mockEnvObject } from '@sim/testing/mocks/env.mock'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NexoraWandUnavailableError, nexoraWandComplete, nexoraWandStream } from '@/lib/nexora/wand'

const messages = [
  { role: 'system' as const, content: 'Tu écris des objets d’e-mail.' },
  { role: 'user' as const, content: 'Relance de facture' },
]

function sse(lines: string[]): Response {
  const body = new ReadableStream({
    start(controller) {
      for (const line of lines) controller.enqueue(new TextEncoder().encode(`${line}\n\n`))
      controller.close()
    },
  })
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
}

async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
  return new Response(stream).text()
}

describe('Nexora wand', () => {
  const fetchMock = vi.fn()
  beforeEach(() => {
    mockEnvObject.VLLM_BASE_URL = 'http://nexora-api:8000/v1'
    mockEnvObject.VLLM_API_KEY = 'sk-workstudio'
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    fetchMock.mockReset()
  })

  it('asks the Nexora default model and returns the text and usage', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        choices: [{ message: { content: ' Relance : facture F-104 ' } }],
        usage: { prompt_tokens: 12, completion_tokens: 6 },
      })
    )
    await expect(nexoraWandComplete({ messages })).resolves.toEqual({
      text: 'Relance : facture F-104',
      usage: { promptTokens: 12, completionTokens: 6 },
    })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://nexora-api:8000/v1/chat/completions')
    expect(init.headers.Authorization).toBe('Bearer sk-workstudio')
    expect(JSON.parse(init.body)).toMatchObject({
      model: 'nexora-default',
      messages,
      stream: false,
    })
  })

  it('streams in the wand format: one chunk event per delta, then done', async () => {
    fetchMock.mockResolvedValue(
      sse([
        'data: {"choices":[{"delta":{"content":"Rel"}}]}',
        'data: {"choices":[{"delta":{"content":"ance"}}]}',
        'data: {"choices":[],"usage":{"prompt_tokens":3,"completion_tokens":2}}',
        'data: [DONE]',
      ])
    )
    const onUsage = vi.fn()
    const text = await readAll(await nexoraWandStream({ messages, onUsage }))
    expect(text).toBe('data: {"chunk":"Rel"}\n\ndata: {"chunk":"ance"}\n\ndata: {"done":true}\n\n')
    expect(onUsage).toHaveBeenCalledWith({ promptTokens: 3, completionTokens: 2 })
  })

  it('reports Nexora API being unreachable or failing as unavailable', async () => {
    fetchMock.mockResolvedValue(new Response('busy', { status: 503 }))
    await expect(nexoraWandComplete({ messages })).rejects.toBeInstanceOf(
      NexoraWandUnavailableError
    )
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))
    await expect(nexoraWandStream({ messages })).rejects.toBeInstanceOf(NexoraWandUnavailableError)
  })
})
