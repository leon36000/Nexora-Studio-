import { describe, expect, it, vi } from 'vitest'
import { type ApiExecutorDeps, executeApiItem } from '@/lib/nexora/batches/api-executor'
import type { BatchRecord, ItemRecord } from '@/lib/nexora/batches/repository'
import { gatewayErrors } from '@/lib/nexora/developer-api/errors'
import type { SpendingReservation } from '@/lib/nexora/developer-api/gateway'
import type { GatewayKey } from '@/lib/nexora/developer-api/policy'

const NOW = new Date('2026-10-25T10:00:00Z')

const key: GatewayKey = {
  id: 'key-1',
  name: 'n8n compta',
  scope: 'workspace',
  workspaceId: 'ws-1',
  createdBy: 'user-1',
  allowedModels: null,
  allowAgents: false,
  monthlyTokenCap: null,
  requestsPerMinute: 60,
  expiresAt: null,
  revokedAt: null,
}

const batch = {
  id: 'b1',
  apiKeyId: 'key-1',
  workspaceId: 'ws-1',
  endpoint: '/v1/chat/completions',
  model: 'qwen2.5:7b',
} as BatchRecord

const item = {
  id: 'i1',
  batchId: 'b1',
  position: 0,
  customId: 'c0',
  attempt: 1,
  rowRef: null,
  request: {
    model: 'qwen2.5:7b',
    messages: [{ role: 'user', content: 'Bonjour' }],
    max_tokens: 20,
  },
} as ItemRecord

const completion = {
  id: 'chatcmpl-1',
  choices: [{ message: { role: 'assistant', content: 'Bonjour !' } }],
  usage: { prompt_tokens: 7, completion_tokens: 3 },
}

function setup(overrides: Partial<ApiExecutorDeps> = {}) {
  const settle = vi.fn(async () => {})
  const release = vi.fn(async () => {})
  const reservation: SpendingReservation = {
    estimate: { promptTokens: 10, completionTokens: 20 },
    settle,
    release,
  }
  const finish = vi.fn()
  const deps: ApiExecutorDeps = {
    now: () => NOW,
    loadKey: vi.fn(async () => key),
    admitModel: vi.fn(async (_key, model) => model),
    reserveSpending: vi.fn(async () => reservation),
    callUpstream: vi.fn(async () => Response.json(completion)),
    beginTrace: vi.fn(() => ({ finish })),
    ...overrides,
  }
  const signal = new AbortController().signal
  return { deps, settle, release, finish, signal }
}

describe('executeApiItem', () => {
  it('relays the request, settles the key with the real usage and traces the call', async () => {
    const { deps, settle, finish, signal } = setup()
    const outcome = await executeApiItem(batch, item, signal, deps)
    expect(outcome.kind).toBe('done')
    if (outcome.kind !== 'done') return
    expect(outcome.result.response).toMatchObject({ status_code: 200, body: completion })
    expect(outcome.result.promptTokens).toBe(7)
    expect(settle).toHaveBeenCalledWith({ promptTokens: 7, completionTokens: 3 })
    expect(deps.beginTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'api_key',
        apiKeyId: 'key-1',
        name: 'API · lot · n8n compta',
      }),
      'qwen2.5:7b',
      item.request.messages
    )
    expect(finish).toHaveBeenCalledWith(
      expect.objectContaining({ answer: 'Bonjour !', error: null })
    )
  })

  it('always asks for a whole answer, never a stream', async () => {
    const { deps, signal } = setup()
    await executeApiItem(batch, item, signal, deps)
    const sent = JSON.parse(
      String((vi.mocked(deps.callUpstream).mock.calls[0][1] as { body: string }).body)
    )
    expect(sent.stream).toBe(false)
  })

  it('sends embeddings to the embeddings endpoint', async () => {
    const { deps, signal } = setup({
      callUpstream: vi.fn(async () =>
        Response.json({
          data: [{ embedding: [0.1] }],
          usage: { prompt_tokens: 4, total_tokens: 4 },
        })
      ),
    })
    const outcome = await executeApiItem(
      { ...batch, endpoint: '/v1/embeddings' } as BatchRecord,
      { ...item, request: { model: 'nomic', input: 'texte' } } as ItemRecord,
      signal,
      deps
    )
    expect(vi.mocked(deps.callUpstream).mock.calls[0][0]).toBe('/embeddings')
    expect(outcome.kind).toBe('done')
  })

  it.each([
    ['revoked', { ...key, revokedAt: NOW }, 'revoked_api_key'],
    ['expired', { ...key, expiresAt: new Date(NOW.getTime() - 1000) }, 'expired_api_key'],
  ])('makes no call when the key is %s', async (_name, current, code) => {
    const { deps, signal } = setup({ loadKey: vi.fn(async () => current) })
    const outcome = await executeApiItem(batch, item, signal, deps)
    expect(outcome).toMatchObject({ kind: 'error', retryable: false, problem: { code } })
    expect(deps.callUpstream).not.toHaveBeenCalled()
  })

  it('makes no call when the key was deleted', async () => {
    const { deps, signal } = setup({ loadKey: vi.fn(async () => null) })
    const outcome = await executeApiItem(batch, item, signal, deps)
    expect(outcome).toMatchObject({ kind: 'error', problem: { code: 'revoked_api_key' } })
    expect(deps.callUpstream).not.toHaveBeenCalled()
  })

  it('makes no call once the model is no longer allowed for the key', async () => {
    const { deps, signal } = setup({
      admitModel: vi.fn(async () => {
        throw gatewayErrors.modelNotAllowed('qwen2.5:7b', ['glm'])
      }),
    })
    const outcome = await executeApiItem(batch, item, signal, deps)
    expect(outcome).toMatchObject({
      kind: 'error',
      retryable: false,
      problem: { code: 'model_not_allowed' },
    })
    expect(deps.callUpstream).not.toHaveBeenCalled()
  })

  it.each([
    ['monthly cap', gatewayErrors.monthlyCapReached(1000), 'monthly_cap_reached'],
    ['budget', gatewayErrors.budgetReached('Budget atteint.'), 'monthly_budget_reached'],
  ])('fails the request without a call when the %s is reached', async (_name, error, code) => {
    const { deps, signal } = setup({
      reserveSpending: vi.fn(async () => {
        throw error
      }),
    })
    const outcome = await executeApiItem(batch, item, signal, deps)
    expect(outcome).toMatchObject({ kind: 'error', retryable: false, problem: { code } })
    expect(deps.callUpstream).not.toHaveBeenCalled()
  })

  it('tries again when the model is busy, and releases the reservation', async () => {
    const { deps, release, signal } = setup({
      callUpstream: vi.fn(async () => new Response('{}', { status: 503 })),
    })
    const outcome = await executeApiItem(batch, item, signal, deps)
    expect(outcome).toMatchObject({
      kind: 'error',
      retryable: true,
      problem: { code: 'model_busy' },
    })
    expect(release).toHaveBeenCalled()
  })

  it('tries again when Nexora API cannot be reached', async () => {
    const { deps, release, signal } = setup({
      callUpstream: vi.fn(async () => {
        throw gatewayErrors.unavailable()
      }),
    })
    const outcome = await executeApiItem(batch, item, signal, deps)
    expect(outcome).toMatchObject({ kind: 'error', retryable: true })
    expect(release).toHaveBeenCalled()
  })

  it('keeps the model’s refusal of a bad request as the request’s response, without trying again', async () => {
    const { deps, release, finish, signal } = setup({
      callUpstream: vi.fn(
        async () =>
          new Response(JSON.stringify({ detail: 'max_tokens trop grand' }), {
            status: 400,
            headers: { 'content-type': 'application/json' },
          })
      ),
    })
    const outcome = await executeApiItem(batch, item, signal, deps)
    expect(outcome).toMatchObject({
      kind: 'error',
      retryable: false,
      problem: { code: 'invalid_request', status: 400 },
      response: { status_code: 400 },
    })
    expect(release).toHaveBeenCalled()
    expect(finish).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }))
  })

  it('releases the reservation and reports an abort without recording a failure', async () => {
    const controller = new AbortController()
    const { deps, release } = setup({
      callUpstream: vi.fn(async () => {
        controller.abort()
        throw new DOMException('aborted', 'AbortError')
      }),
    })
    const outcome = await executeApiItem(batch, item, controller.signal, deps)
    expect(outcome.kind).toBe('aborted')
    expect(release).toHaveBeenCalled()
  })

  it('settles the estimate when the answer cannot be read', async () => {
    const { deps, settle, signal } = setup({
      callUpstream: vi.fn(async () => new Response('pas du json', { status: 200 })),
    })
    const outcome = await executeApiItem(batch, item, signal, deps)
    expect(outcome).toMatchObject({ kind: 'error', retryable: true })
    expect(settle).toHaveBeenCalledWith({ promptTokens: 10, completionTokens: 20 })
  })
})
