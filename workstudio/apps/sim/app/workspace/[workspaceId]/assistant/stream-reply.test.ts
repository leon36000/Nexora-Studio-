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

  it('asks for the agent-events and chat-outputs protocols, so reasoning, files and sources come apart from the answer', async () => {
    fetchMock.mockResolvedValueOnce(sseResponse([{ event: 'final', data: { success: true } }]))
    await run()
    const headers = new Headers(fetchMock.mock.calls[0][1]?.headers)
    expect(headers.get('x-sim-stream-protocol')).toBe('agent-events-v1, chat-outputs-v1')
  })

  it('reports the reasoning apart and never mixes it into the answer', async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse([
        { blockId: 'agent', event: 'thinking', data: 'Je ' },
        { blockId: 'agent', event: 'thinking', data: 'réfléchis.' },
        { blockId: 'agent', chunk: 'Bonjour' },
        { event: 'final', data: { success: true, output: {} } },
      ])
    )
    const thoughts: string[] = []
    const outcome = await streamAgentReply({
      chatIdentifier: 'assistant-general',
      body: { input: 'Bonjour', conversationId: 'conv-1' },
      signal: new AbortController().signal,
      onText: () => {},
      onThinking: (text) => thoughts.push(text),
    })
    expect(outcome).toEqual({ status: 'done', text: 'Bonjour' })
    expect(thoughts).toEqual(['Je ', 'Je réfléchis.'])
  })

  it('reports the files and the numbered sources the agent returns beside its answer', async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse([
        { blockId: 'agent', chunk: 'Livraison offerte dès 80 € [1].' },
        {
          blockId: 'agent',
          event: 'output',
          path: 'files',
          data: [
            {
              name: 'ventes.png',
              type: 'image/png',
              size: 9,
              url: 'http://x.test/api/files/serve/k',
            },
          ],
        },
        {
          blockId: 'agent',
          event: 'output',
          path: 'sources',
          data: [{ index: 1, kind: 'document', title: 'CGV.pdf' }],
        },
        { event: 'final', data: { success: true, output: {} } },
      ])
    )
    const extras: unknown[] = []
    const outcome = await streamAgentReply({
      chatIdentifier: 'assistant-general',
      body: { input: 'Bonjour', conversationId: 'conv-1' },
      signal: new AbortController().signal,
      onText: () => {},
      onExtras: (value) => extras.push(value),
    })
    expect(outcome.status).toBe('done')
    expect(extras.at(-1)).toEqual({
      files: [{ name: 'ventes.png', type: 'image/png', size: 9, url: '/api/files/serve/k' }],
      sources: [{ index: 1, kind: 'document', title: 'CGV.pdf' }],
    })
    expect(outcome).toMatchObject({
      files: [{ name: 'ventes.png' }],
      sources: [{ title: 'CGV.pdf' }],
    })
  })

  it('hands the person each confirmation request, then its end', async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse([
        {
          event: 'confirmation',
          data: {
            id: 'req-1',
            token: 't'.repeat(40),
            title: 'postmark.send_email',
            toolName: 'execute_action',
            summary: '{"to":"a@b.fr"}',
            expiresAt: '2026-10-24T10:00:00.000Z',
          },
        },
        { event: 'confirmation_end', data: { id: 'req-1', decision: 'deny' } },
        { blockId: 'agent', chunk: "Je n'ai rien envoyé." },
        { event: 'final', data: { success: true, output: {} } },
      ])
    )
    const seen: string[] = []
    await streamAgentReply({
      chatIdentifier: 'assistant-general',
      body: { input: 'Envoie', conversationId: 'conv-1' },
      signal: new AbortController().signal,
      onText: () => {},
      onConfirmation: (request) => seen.push(`demande ${request.id} ${request.title}`),
      onConfirmationEnd: (end) => seen.push(`fin ${end.id} ${end.decision}`),
    })
    expect(seen).toEqual(['demande req-1 postmark.send_email', 'fin req-1 deny'])
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
