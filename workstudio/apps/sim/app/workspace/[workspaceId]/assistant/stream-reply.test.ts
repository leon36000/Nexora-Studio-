import { jsonResponse } from '@sim/testing/helpers/http'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { streamAgentReply } from '@/app/workspace/[workspaceId]/assistant/stream-reply'

function sseResponse(events: unknown[], { done = true }: { done?: boolean } = {}): Response {
  const text = [
    ...events.map((event) => `data: ${JSON.stringify(event)}\n\n`),
    ...(done ? ['data: [DONE]\n\n'] : []),
  ].join('')
  return new Response(text, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
}

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

async function run(signal = new AbortController().signal) {
  const seen: string[] = []
  const outcome = await streamAgentReply({
    chatIdentifier: 'assistant-general',
    body: { input: 'Bonjour', conversationId: 'conv-1' },
    signal,
    onText: (text) => seen.push(text),
  })
  return { outcome, seen }
}

describe('streamAgentReply', () => {
  it('posts the question to the deployed chat with the conversation as the agent memory', async () => {
    fetchMock.mockResolvedValueOnce(sseResponse([{ event: 'final', data: { success: true } }]))
    await run()
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('/api/chat/assistant-general')
    expect(JSON.parse(String(init?.body))).toMatchObject({
      input: 'Bonjour',
      conversationId: 'conv-1',
    })
  })

  it('accumulates the answer chunks and reports the whole text so far', async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse([
        { blockId: 'agent', chunk: 'Bon' },
        { blockId: 'agent', chunk: 'jour' },
        { event: 'final', data: { success: true, output: {} } },
      ])
    )
    expect(await run()).toEqual({
      outcome: { status: 'done', text: 'Bonjour' },
      seen: ['Bon', 'Bonjour'],
    })
  })

  it('drops a block text the server resets (an intermediate tool-calling turn)', async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse([
        { blockId: 'agent', chunk: 'Je cherche…' },
        { event: 'chunk_reset', blockId: 'agent' },
        { blockId: 'agent', chunk: 'Voici la réponse.' },
        { event: 'final', data: { success: true } },
      ])
    )
    expect((await run()).outcome).toEqual({ status: 'done', text: 'Voici la réponse.' })
  })

  it('falls back to the final output when nothing was streamed', async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse([
        {
          event: 'final',
          data: { success: true, output: { agent: { content: 'Réponse entière' } } },
        },
      ])
    )
    expect((await run()).outcome).toEqual({ status: 'done', text: 'Réponse entière' })
  })

  it('reports a failed run, keeping the text already streamed', async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse([
        { blockId: 'agent', chunk: 'Début' },
        { event: 'final', data: { success: false, error: 'Model unavailable' } },
      ])
    )
    expect((await run()).outcome).toEqual({ status: 'error', code: 'failed', text: 'Début' })
  })

  it('reports an error frame as a failed answer', async () => {
    fetchMock.mockResolvedValueOnce(sseResponse([{ event: 'error', error: 'Boom' }]))
    expect((await run()).outcome).toEqual({ status: 'error', code: 'failed', text: '' })
  })

  it('reports an interruption when the stream ends without a terminal frame', async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse([{ blockId: 'agent', chunk: 'Début' }], { done: false })
    )
    expect((await run()).outcome).toEqual({ status: 'error', code: 'interrupted', text: 'Début' })
  })

  it('maps refusals of the deployed chat to the reasons the page words', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'Chat not found' }, 404))
    expect((await run()).outcome).toEqual({ status: 'error', code: 'agent-unavailable', text: '' })
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'unavailable' }, 403))
    expect((await run()).outcome).toEqual({ status: 'error', code: 'agent-unavailable', text: '' })
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'Authentication required' }, 401))
    expect((await run()).outcome).toEqual({ status: 'error', code: 'forbidden', text: '' })
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'Too many requests' }, 429))
    expect((await run()).outcome).toEqual({ status: 'error', code: 'rate-limited', text: '' })
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'Invalid request body' }, 400))
    expect((await run()).outcome).toEqual({ status: 'error', code: 'invalid', text: '' })
  })

  it('ends as stopped with the partial text when the answer is aborted', async () => {
    const controller = new AbortController()
    const encoder = new TextEncoder()
    fetchMock.mockImplementationOnce(async () => {
      const body = new ReadableStream<Uint8Array>({
        start(stream) {
          stream.enqueue(
            encoder.encode(`data: ${JSON.stringify({ blockId: 'a', chunk: 'Dé' })}\n\n`)
          )
          controller.signal.addEventListener('abort', () =>
            stream.error(new DOMException('aborted', 'AbortError'))
          )
        },
      })
      return new Response(body, { status: 200 })
    })
    const seen: string[] = []
    const pending = streamAgentReply({
      chatIdentifier: 'assistant-general',
      body: { input: 'Bonjour', conversationId: 'conv-1' },
      signal: controller.signal,
      onText: (text) => {
        seen.push(text)
        controller.abort()
      },
    })
    expect(await pending).toEqual({ status: 'stopped', text: 'Dé' })
  })
})
