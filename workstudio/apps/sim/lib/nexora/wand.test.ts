import { flushMicrotasks } from '@sim/testing/helpers/async'
import { mockEnvObject } from '@sim/testing/mocks/env.mock'
import {
  nexoraDataProtectionMock,
  nexoraDataProtectionMockFns,
} from '@sim/testing/mocks/nexora-data-protection.mock'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PersonalDataRefusedError,
  PersonalDataServiceError,
} from '@/lib/nexora/data-protection/errors'
import { resetProtectionCache } from '@/lib/nexora/data-protection/masking'
import { isOffInstanceModel } from '@/lib/nexora/data-protection/model-location'
import { recordTrace } from '@/lib/nexora/traces/record'
import {
  describeWandFailure,
  NexoraWandRejectedError,
  NexoraWandUnavailableError,
  nexoraWandComplete,
  nexoraWandStream,
} from '@/lib/nexora/wand'

vi.mock('@/lib/nexora/traces/record', () => ({ recordTrace: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/nexora/data-protection/policy', () => nexoraDataProtectionMock)
vi.mock('@/lib/nexora/data-protection/model-location', () => ({
  isOffInstanceModel: vi.fn(async () => true),
}))

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

  it('lets an evaluation pick the model, a zero temperature and a token ceiling, and traces that model', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ choices: [{ message: { content: 'ok' } }], usage: { prompt_tokens: 3 } })
    )
    await nexoraWandComplete({
      messages,
      model: 'qwen2.5:7b',
      temperature: 0,
      maxTokens: 700,
      trace: { source: 'playground', workspaceId: 'ws-1', userId: 'user-1', name: 'Évaluation' },
    })
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      model: 'qwen2.5:7b',
      temperature: 0,
      max_tokens: 700,
    })
    expect(vi.mocked(recordTrace).mock.calls.at(-1)?.[0].spans[0].model).toBe('qwen2.5:7b')
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

  describe('traces', () => {
    const trace = {
      source: 'copilot' as const,
      workspaceId: 'ws-1',
      userId: 'user-1',
      name: 'Copilote',
    }
    const lastDraft = () => vi.mocked(recordTrace).mock.calls.at(-1)?.[0]

    it('records one trace for a whole answer, with its text, tokens and the model', async () => {
      fetchMock.mockResolvedValue(
        Response.json({
          choices: [{ message: { content: ' Relance : facture F-104 ' } }],
          usage: { prompt_tokens: 12, completion_tokens: 6 },
        })
      )
      await nexoraWandComplete({ messages, trace })
      expect(recordTrace).toHaveBeenCalledTimes(1)
      expect(lastDraft()).toMatchObject({
        source: 'copilot',
        visibility: 'private',
        workspaceId: 'ws-1',
        userId: 'user-1',
        status: 'ok',
        output: 'Relance : facture F-104',
        inputTokens: 12,
        outputTokens: 6,
        input: 'Relance de facture',
      })
      expect(lastDraft()?.spans[0].model).toBe('nexora-default')
    })

    it('records a streamed answer once it is over: text, reasoning and usage', async () => {
      fetchMock.mockResolvedValue(
        sse([
          'data: {"choices":[{"delta":{"reasoning_content":"Je cherche."}}]}',
          'data: {"choices":[{"delta":{"content":"Rel"}}]}',
          'data: {"choices":[{"delta":{"content":"ance"}}]}',
          'data: {"choices":[],"usage":{"prompt_tokens":3,"completion_tokens":2}}',
          'data: [DONE]',
        ])
      )
      await readAll(
        await nexoraWandStream({
          messages,
          model: 'cloud-glm-5-3',
          trace: { ...trace, source: 'playground', name: 'Playground' },
        })
      )
      expect(recordTrace).toHaveBeenCalledTimes(1)
      expect(lastDraft()).toMatchObject({
        source: 'playground',
        output: 'Relance',
        inputTokens: 3,
        outputTokens: 2,
        status: 'ok',
      })
      expect(lastDraft()?.spans[0]).toMatchObject({ model: 'cloud-glm-5-3' })
      expect(lastDraft()?.spans[0].attributes.reasoning).toBe('Je cherche.')
    })

    it('records a stream the reader stopped as an interrupted answer, once', async () => {
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Début"}}]}\n\n')
          )
        },
      })
      fetchMock.mockResolvedValue(new Response(body, { status: 200 }))
      const stream = await nexoraWandStream({ messages, trace })
      const reader = stream.getReader()
      await reader.read()
      await reader.cancel()
      await flushMicrotasks()
      expect(recordTrace).toHaveBeenCalledTimes(1)
      expect(lastDraft()?.output).toBe('Début')
      expect(lastDraft()?.spans[0].attributes.interrupted).toBe(true)
    })

    it('records a refused or unreachable model as a failed trace, and still reports the failure', async () => {
      fetchMock.mockResolvedValue(
        Response.json({ error: { message: 'context too long' } }, { status: 400 })
      )
      await expect(nexoraWandComplete({ messages, trace })).rejects.toBeInstanceOf(
        NexoraWandRejectedError
      )
      expect(lastDraft()).toMatchObject({
        status: 'error',
        error: expect.stringContaining('context too long'),
      })

      fetchMock.mockResolvedValue(new Response('busy', { status: 503 }))
      await expect(nexoraWandStream({ messages, trace })).rejects.toBeInstanceOf(
        NexoraWandUnavailableError
      )
      expect(recordTrace).toHaveBeenCalledTimes(2)
      expect(lastDraft()).toMatchObject({ status: 'error' })
    })

    it('records nothing when the caller gave no trace context', async () => {
      fetchMock.mockResolvedValue(
        Response.json({
          choices: [{ message: { content: 'ok' } }],
          usage: { prompt_tokens: 1, completion_tokens: 1 },
        })
      )
      await nexoraWandComplete({ messages })
      expect(recordTrace).not.toHaveBeenCalled()
    })
  })
})

describe('Nexora wand under a personal-data policy', () => {
  const fetchMock = vi.fn()
  const IBAN = 'FR76 3000 6000 0112 3456 7890 189'
  const sensitive = [
    { role: 'system' as const, content: 'Tu rédiges des relances.' },
    {
      role: 'user' as const,
      content: `Relance pour le client, IBAN ${IBAN}, écrire à marie@exemple.fr`,
    },
  ]
  const trace = {
    source: 'playground' as const,
    workspaceId: 'ws-compta',
    userId: 'u-1',
    name: 'Playground',
  }

  function answer(): void {
    fetchMock.mockResolvedValue(
      Response.json({ choices: [{ message: { content: 'ok' } }], usage: { prompt_tokens: 3 } })
    )
  }

  beforeEach(() => {
    mockEnvObject.VLLM_BASE_URL = 'http://nexora-api:8000/v1'
    mockEnvObject.PII_URL = undefined
    vi.stubGlobal('fetch', fetchMock)
    resetProtectionCache()
    vi.mocked(isOffInstanceModel).mockResolvedValue(true)
    nexoraDataProtectionMockFns.mockLoadDataProtection.mockResolvedValue({
      defaultMode: 'allow',
      workspaceModes: { 'ws-compta': 'mask', 'ws-ventes': 'refuse' },
    })
  })
  afterEach(() => {
    fetchMock.mockReset()
    nexoraDataProtectionMockFns.mockLoadDataProtection.mockReset()
  })

  it('sends a model off the instance the question masked when the workspace says « masquer »', async () => {
    answer()
    await nexoraWandComplete({ messages: sensitive, trace, model: 'cloud-glm-5-3' })
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body).messages
    expect(sent[1].content).toBe('Relance pour le client, IBAN [IBAN], écrire à [E-MAIL]')
    expect(sent[0].content).toBe('Tu rédiges des relances.')
    expect(JSON.stringify(sent)).not.toContain('FR76')
  })

  it('masks a streamed Playground answer too, before the first byte leaves', async () => {
    fetchMock.mockResolvedValue(
      sse(['data: {"choices":[{"delta":{"content":"ok"}}]}', 'data: [DONE]'])
    )
    const text = await readAll(
      await nexoraWandStream({ messages: sensitive, trace, model: 'cloud-glm-5-3' })
    )
    expect(text).toContain('"chunk":"ok"')
    expect(JSON.stringify(JSON.parse(fetchMock.mock.calls[0][1].body).messages)).not.toContain(
      'FR76'
    )
  })

  it('sends a model on this server the question untouched', async () => {
    answer()
    vi.mocked(isOffInstanceModel).mockResolvedValue(false)
    await nexoraWandComplete({ messages: sensitive, trace, model: 'qwen2.5:7b' })
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).messages).toEqual(sensitive)
  })

  it('stops a request holding personal data, before any call, when the workspace says « refuser »', async () => {
    await expect(
      nexoraWandComplete({ messages: sensitive, trace: { ...trace, workspaceId: 'ws-ventes' } })
    ).rejects.toBeInstanceOf(PersonalDataRefusedError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('traces the refused request with its reason', async () => {
    await expect(
      nexoraWandComplete({ messages: sensitive, trace: { ...trace, workspaceId: 'ws-ventes' } })
    ).rejects.toThrow()
    await flushMicrotasks()
    expect(vi.mocked(recordTrace)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(recordTrace).mock.calls[0][0]).toMatchObject({
      status: 'error',
      error: expect.stringContaining('données personnelles'),
    })
  })

  it('leaves a workspace without a mode to the instance default (allow here)', async () => {
    answer()
    await nexoraWandComplete({ messages: sensitive, trace: { ...trace, workspaceId: 'ws-autre' } })
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).messages).toEqual(sensitive)
  })

  it('tells each surface what to answer: 403 for a refusal, 503 when the protection cannot be applied', () => {
    expect(describeWandFailure(new PersonalDataRefusedError({ IBAN_CODE: 1 }))).toMatchObject({
      status: 403,
      code: 'personal_data',
      reason: expect.stringContaining('IBAN'),
    })
    expect(describeWandFailure(new PersonalDataServiceError())).toMatchObject({
      status: 503,
      code: 'personal_data_unavailable',
    })
  })
})
