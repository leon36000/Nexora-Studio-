import { flushMicrotasks } from '@sim/testing/helpers/async'
import { mockEnvObject } from '@sim/testing/mocks/env.mock'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  describeWandFailure,
  NexoraWandRejectedError,
  NexoraWandUnavailableError,
  nexoraWandComplete,
  nexoraWandStream,
} from '@/lib/nexora/wand'

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

  it('asks for a JSON object only when the caller wants JSON mode', async () => {
    fetchMock.mockImplementation(async () =>
      Response.json({ choices: [{ message: { content: '{"ok":true}' } }] })
    )
    await nexoraWandComplete({ messages })
    await nexoraWandComplete({ messages, responseFormat: 'json_object' })
    const [plain, json] = fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body))
    expect(plain).not.toHaveProperty('response_format')
    expect(json.response_format).toEqual({ type: 'json_object' })
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

  it('lets the playground pick the model and its settings, with usage in the final event', async () => {
    fetchMock.mockResolvedValue(
      sse([
        'data: {"choices":[{"delta":{"content":"Oui"}}]}',
        'data: {"choices":[],"usage":{"prompt_tokens":4,"completion_tokens":1}}',
        'data: [DONE]',
      ])
    )
    const stream = await nexoraWandStream({
      messages,
      model: 'mistral-small-latest',
      temperature: 0.9,
      maxTokens: 300,
      reportUsage: true,
    })
    expect(await readAll(stream)).toBe(
      'data: {"chunk":"Oui"}\n\ndata: {"done":true,"usage":{"promptTokens":4,"completionTokens":1}}\n\n'
    )
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect([body.model, body.temperature, body.max_tokens]).toEqual([
      'mistral-small-latest',
      0.9,
      300,
    ])
  })

  it('reports Nexora API being unreachable or failing as unavailable', async () => {
    fetchMock.mockResolvedValue(new Response('busy', { status: 503 }))
    await expect(nexoraWandComplete({ messages })).rejects.toBeInstanceOf(
      NexoraWandUnavailableError
    )
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))
    await expect(nexoraWandStream({ messages })).rejects.toBeInstanceOf(NexoraWandUnavailableError)
  })

  it('reports a request the model refuses as rejected, with its short reason and no secret', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json(
        {
          error: {
            message:
              "This model's maximum context length is 8192 tokens (key sk-workstudio, Bearer sk-workstudio).",
          },
        },
        { status: 400 }
      )
    )
    const refused = await nexoraWandComplete({ messages }).catch((error: unknown) => error)
    expect(refused).toBeInstanceOf(NexoraWandRejectedError)
    const reason = (refused as NexoraWandRejectedError).reason
    expect(reason).toContain('maximum context length is 8192 tokens')
    expect(reason).not.toContain('sk-workstudio')

    fetchMock.mockResolvedValueOnce(Response.json({ detail: 'Model not found' }, { status: 404 }))
    await expect(nexoraWandStream({ messages, model: 'inconnu' })).rejects.toMatchObject({
      name: 'NexoraWandRejectedError',
      reason: 'Model not found',
    })
  })

  it('keeps reporting a refused key, a rate limit or a server error as unavailable', async () => {
    for (const status of [401, 403, 429, 500, 502]) {
      fetchMock.mockResolvedValueOnce(Response.json({ detail: 'nope' }, { status }))
      await expect(nexoraWandComplete({ messages })).rejects.toBeInstanceOf(
        NexoraWandUnavailableError
      )
    }
  })

  it('stops reading Nexora API when the reader cancels, without failing', async () => {
    const cancelUpstream = vi.fn()
    fetchMock.mockResolvedValue(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Rel"}}]}\n\n')
            )
          },
          cancel: cancelUpstream,
        }),
        { status: 200, headers: { 'Content-Type': 'text/event-stream' } }
      )
    )
    const reader = (await nexoraWandStream({ messages })).getReader()
    const first = await reader.read()
    expect(new TextDecoder().decode(first.value)).toBe('data: {"chunk":"Rel"}\n\n')
    await reader.cancel()
    await flushMicrotasks(10)
    expect(cancelUpstream).toHaveBeenCalled()
  })

  it('tells the surfaces a refused request (422) from an unreachable model (503)', () => {
    expect(describeWandFailure(new NexoraWandRejectedError('Model not found'))).toEqual({
      status: 422,
      code: 'rejected',
      reason: 'Model not found',
    })
    expect(describeWandFailure(new NexoraWandUnavailableError('HTTP 502'))).toEqual({
      status: 503,
      code: 'unavailable',
    })
    expect(describeWandFailure(new Error('bug'))).toBeNull()
  })

  describe('reasoning models', () => {
    const events = (text: string) =>
      text
        .split('\n\n')
        .filter((line) => line.startsWith('data: '))
        .map((line) => JSON.parse(line.slice(6)))

    it('returns the answer without the reasoning, whatever its shape (Copilot JSON stays JSON)', async () => {
      fetchMock.mockResolvedValueOnce(
        Response.json({
          choices: [{ message: { content: '{"ok":true}', reasoning_content: 'Je vérifie.' } }],
        })
      )
      fetchMock.mockResolvedValueOnce(
        Response.json({ choices: [{ message: { content: '<think>plan</think>\n{"ok":true}' } }] })
      )
      await expect(nexoraWandComplete({ messages })).resolves.toMatchObject({ text: '{"ok":true}' })
      await expect(nexoraWandComplete({ messages })).resolves.toMatchObject({ text: '{"ok":true}' })
    })

    it('streams the reasoning in its own events when asked, never in chunks', async () => {
      fetchMock.mockResolvedValue(
        sse([
          'data: {"choices":[{"delta":{"reasoning_content":"Je ","reasoning":"Je ","content":""}}]}',
          'data: {"choices":[{"delta":{"reasoning_content":"pense."}}]}',
          'data: {"choices":[{"delta":{"content":"Bonjour"}}]}',
          'data: [DONE]',
        ])
      )
      const text = await readAll(await nexoraWandStream({ messages, includeThinking: true }))
      expect(events(text)).toEqual([
        { thinking: 'Je ' },
        { thinking: 'pense.' },
        { chunk: 'Bonjour' },
        { done: true },
      ])
    })

    it('splits inline think tags cut across chunks out of the answer', async () => {
      fetchMock.mockResolvedValue(
        sse([
          'data: {"choices":[{"delta":{"content":"<thi"}}]}',
          'data: {"choices":[{"delta":{"content":"nk>réfl"}}]}',
          'data: {"choices":[{"delta":{"content":"exion</think>Bon"}}]}',
          'data: {"choices":[{"delta":{"content":"jour"}}]}',
          'data: [DONE]',
        ])
      )
      const parsed = events(
        await readAll(await nexoraWandStream({ messages, includeThinking: true }))
      )
      expect(parsed.map((e) => e.chunk ?? '').join('')).toBe('Bonjour')
      expect(parsed.map((e) => e.thinking ?? '').join('')).toBe('réflexion')
    })

    it('keeps the generation alive without showing the reasoning when it is not asked for', async () => {
      fetchMock.mockResolvedValue(
        sse([
          'data: {"choices":[{"delta":{"reasoning_content":"secret"}}]}',
          'data: {"choices":[{"delta":{"content":"Objet : relance"}}]}',
          'data: [DONE]',
        ])
      )
      const text = await readAll(await nexoraWandStream({ messages }))
      expect(text).not.toContain('secret')
      expect(text).toContain(': reflexion')
      expect(events(text)).toEqual([{ chunk: 'Objet : relance' }, { done: true }])
    })

    it('sends reasoning_effort only when chosen, and drops it when the model refuses it', async () => {
      fetchMock.mockResolvedValueOnce(
        Response.json(
          {
            detail: {
              error: {
                message:
                  "litellm.UnsupportedParamsError: openrouter does not support parameters: ['reasoning_effort']",
              },
            },
          },
          { status: 400 }
        )
      )
      fetchMock.mockResolvedValueOnce(
        sse(['data: {"choices":[{"delta":{"content":"Oui"}}]}', 'data: [DONE]'])
      )
      const text = await readAll(
        await nexoraWandStream({ messages, reasoningEffort: 'high', reportUsage: true })
      )
      const [first, second] = fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body))
      expect(first.reasoning_effort).toBe('high')
      expect(second).not.toHaveProperty('reasoning_effort')
      expect(events(text)).toEqual([{ chunk: 'Oui' }, { done: true, effortIgnored: true }])

      fetchMock.mockResolvedValueOnce(sse(['data: [DONE]']))
      await readAll(await nexoraWandStream({ messages }))
      expect(JSON.parse(fetchMock.mock.calls[2][1].body)).not.toHaveProperty('reasoning_effort')
    })
  })
})
