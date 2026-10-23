import { jsonResponse } from '@sim/testing/helpers/http'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { streamPlaygroundAnswer } from '@/app/workspace/[workspaceId]/playground/stream-answer'

const body = {
  workspaceId: 'ws-1',
  model: 'vllm/nexora-default',
  messages: [{ role: 'user' as const, content: 'Bonjour' }],
  temperature: 0.7,
  maxTokens: 256,
}

function sseResponse(events: unknown[]): Response {
  const text = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('')
  return new Response(text, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
}

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

async function run(signal = new AbortController().signal) {
  const chunks: string[] = []
  const outcome = await streamPlaygroundAnswer({ body, signal, onChunk: (c) => chunks.push(c) })
  return { outcome, text: chunks.join('') }
}

describe('streamPlaygroundAnswer', () => {
  it('relays every chunk and the usage of the final event', async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse([
        { chunk: 'Bon' },
        { chunk: 'jour' },
        { done: true, usage: { promptTokens: 12, completionTokens: 3 } },
      ])
    )
    expect(await run()).toEqual({
      outcome: { status: 'done', usage: { promptTokens: 12, completionTokens: 3 } },
      text: 'Bonjour',
    })
  })

  it('reports an interruption when the stream carries an error event', async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse([{ chunk: 'Bon' }, { error: 'Streaming failed', done: true }])
    )
    expect((await run()).outcome).toEqual({ status: 'error', code: 'interrupted' })
  })

  it('reports an interruption when the stream ends without its final event', async () => {
    fetchMock.mockResolvedValueOnce(sseResponse([{ chunk: 'Bon' }]))
    expect((await run()).outcome).toEqual({ status: 'error', code: 'interrupted' })
  })

  it('maps refusals to the reasons the page words', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'unavailable' }, 503))
    expect((await run()).outcome).toEqual({ status: 'error', code: 'unavailable' })
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'Forbidden' }, 403))
    expect((await run()).outcome).toEqual({ status: 'error', code: 'forbidden' })
  })

  it('ends as stopped, not failed, when the answer is aborted', async () => {
    const controller = new AbortController()
    fetchMock.mockImplementationOnce(async () => {
      controller.abort()
      throw new DOMException('aborted', 'AbortError')
    })
    expect((await run(controller.signal)).outcome).toEqual({ status: 'stopped' })
  })
})
