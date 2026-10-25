/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockAdmit, mockReserve, mockCallUpstream, mockRecord, settle, release } = vi.hoisted(
  () => ({
    mockAdmit: vi.fn(),
    mockReserve: vi.fn(),
    mockCallUpstream: vi.fn(),
    mockRecord: vi.fn(),
    settle: vi.fn(),
    release: vi.fn(),
  })
)

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
vi.mock('@/lib/nexora/traces/record', () => ({ recordTrace: mockRecord }))

import { interactiveBusy } from '@/lib/nexora/background-load'
import type { GatewayCall } from '@/lib/nexora/developer-api/gateway'
import { relayChatCompletion } from '@/lib/nexora/developer-api/models'

const call = {
  key: { id: 'key-1', name: 'Clé de test', scope: 'workspace', workspaceId: 'ws-1' },
  headers: {},
} as unknown as GatewayCall

const body = {
  model: 'nexora-default',
  messages: [{ role: 'user', content: 'Bonjour' }],
}

async function readAll(response: Response) {
  return response.text()
}

describe('relayChatCompletion — trace', () => {
  beforeEach(() => {
    mockAdmit.mockResolvedValue('cloud-glm-5-3')
    mockReserve.mockResolvedValue({
      estimate: { promptTokens: 5, completionTokens: 5 },
      settle,
      release,
    })
  })

  it('signale un appel interactif : les lots et les campagnes lui cèdent la place', async () => {
    mockCallUpstream.mockResolvedValue(
      Response.json({ choices: [{ message: { content: 'ok' } }], usage: {} })
    )
    await relayChatCompletion(call, body, new AbortController().signal)
    expect(await interactiveBusy()).toBe(true)
  })

  it('trace un appel sans flux : clé, espace, réponse, jetons', async () => {
    mockCallUpstream.mockResolvedValue(
      Response.json({
        choices: [{ message: { content: 'Salut !' } }],
        usage: { prompt_tokens: 8, completion_tokens: 3 },
      })
    )
    await relayChatCompletion(call, body, new AbortController().signal)
    expect(mockRecord).toHaveBeenCalledTimes(1)
    expect(mockRecord.mock.calls[0][0]).toMatchObject({
      source: 'api_key',
      apiKeyId: 'key-1',
      workspaceId: 'ws-1',
      userId: null,
      visibility: 'workspace',
      status: 'ok',
      output: 'Salut !',
      inputTokens: 8,
      outputTokens: 3,
      input: 'Bonjour',
    })
    expect(mockRecord.mock.calls[0][0].spans[0].model).toBe('nexora-default')
  })

  it('trace un appel en flux une fois le flux lu, sans changer les octets', async () => {
    const chunks = [
      `data: ${JSON.stringify({ choices: [{ delta: { content: 'Sa' } }] })}\n\n`,
      `data: ${JSON.stringify({ choices: [{ delta: { content: 'lut' } }] })}\n\n`,
      `data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: 8, completion_tokens: 3 } })}\n\n`,
      'data: [DONE]\n\n',
    ]
    mockCallUpstream.mockResolvedValue(
      new Response(
        new ReadableStream({
          start(controller) {
            for (const part of chunks) controller.enqueue(new TextEncoder().encode(part))
            controller.close()
          },
        }),
        { status: 200 }
      )
    )
    const response = await relayChatCompletion(
      call,
      { ...body, stream: true },
      new AbortController().signal
    )
    expect(await readAll(response)).toBe(chunks.join(''))
    expect(mockRecord).toHaveBeenCalledTimes(1)
    expect(mockRecord.mock.calls[0][0]).toMatchObject({
      output: 'Salut',
      inputTokens: 8,
      outputTokens: 3,
    })
  })

  it('trace aussi le refus du modèle en amont, comme une erreur', async () => {
    mockCallUpstream.mockResolvedValue(new Response('{"detail":"trop long"}', { status: 400 }))
    await expect(
      relayChatCompletion(call, body, new AbortController().signal)
    ).rejects.toBeDefined()
    expect(mockRecord).toHaveBeenCalledTimes(1)
    expect(mockRecord.mock.calls[0][0]).toMatchObject({ status: 'error' })
  })

  it('ne trace rien quand la clé est refusée avant l’appel (modèle interdit)', async () => {
    mockAdmit.mockRejectedValue(new Error('model_not_allowed'))
    await expect(
      relayChatCompletion(call, body, new AbortController().signal)
    ).rejects.toBeDefined()
    expect(mockRecord).not.toHaveBeenCalled()
  })

  it('ne casse pas la réponse quand la trace ne peut pas être écrite', async () => {
    mockRecord.mockRejectedValue(new Error('base indisponible'))
    mockCallUpstream.mockResolvedValue(Response.json({ choices: [{ message: { content: 'ok' } }] }))
    const response = await relayChatCompletion(call, body, new AbortController().signal)
    expect(response.status).toBe(200)
  })
})
