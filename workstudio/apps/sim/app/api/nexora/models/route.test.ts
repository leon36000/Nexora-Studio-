import { createRouteContext } from '@sim/testing/helpers/http'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const admin = vi.hoisted(() => ({
  authorize: vi.fn(),
  list: vi.fn(),
  add: vi.fn(),
  setDefault: vi.fn(),
  remove: vi.fn(),
  test: vi.fn(),
  localModels: vi.fn(),
  pull: vi.fn(),
  deleteLocal: vi.fn(),
}))

vi.mock('@/lib/nexora/admin-access', () => ({ authorizeInstanceAdmin: admin.authorize }))

vi.mock('@/lib/nexora/model-admin', () => {
  class NexoraModelAdminUnavailableError extends Error {}
  class NexoraModelError extends Error {
    constructor(
      readonly code: string,
      detail: string
    ) {
      super(detail)
    }
  }
  return {
    listNexoraModels: admin.list,
    addNexoraModel: admin.add,
    setDefaultNexoraModel: admin.setDefault,
    removeNexoraModel: admin.remove,
    testNexoraModel: admin.test,
    NexoraModelAdminUnavailableError,
    NexoraModelError,
  }
})

vi.mock('@/lib/nexora/ollama', () => ({
  OLLAMA_CATALOG: [{ name: 'qwen2.5:3b', diskGb: 1.9, memoryGb: 4, paramsB: 3 }],
  OllamaUnavailableError: class OllamaUnavailableError extends Error {},
  listLocalModels: admin.localModels,
  pullLocalModel: admin.pull,
  deleteLocalModel: admin.deleteLocal,
}))

import { NexoraModelAdminUnavailableError, NexoraModelError } from '@/lib/nexora/model-admin'
import { OllamaUnavailableError } from '@/lib/nexora/ollama'
import { POST as SET_DEFAULT } from '@/app/api/nexora/models/[id]/default/route'
import { DELETE } from '@/app/api/nexora/models/[id]/route'
import { POST as TEST } from '@/app/api/nexora/models/[id]/test/route'
import { POST as PULL } from '@/app/api/nexora/models/ollama/pull/route'
import { GET, POST } from '@/app/api/nexora/models/route'

const qwen = {
  id: 7,
  name: 'qwen2.5:7b',
  isDefault: true,
  source: 'ollama',
  providerModel: 'qwen2.5:7b',
  providerUrl: 'http://ollama:11434',
}

function post(path: string, body?: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

describe('Nexora models routes', () => {
  beforeEach(() => {
    admin.authorize.mockResolvedValue({ ok: true, userId: 'u-1' })
    admin.list.mockResolvedValue([qwen])
    admin.localModels.mockResolvedValue(['qwen2.5:7b', 'qwen2.5:3b'])
    admin.deleteLocal.mockResolvedValue(undefined)
  })

  it('serves nothing and touches nothing for a non-admin', async () => {
    admin.authorize.mockResolvedValue({ ok: false, status: 403 })
    const responses = [
      await GET(new NextRequest('http://localhost/api/nexora/models'), {}),
      await POST(post('/api/nexora/models', { source: 'ollama', model: 'qwen2.5:3b' }), {}),
      await DELETE(
        new NextRequest('http://localhost/api/nexora/models/8', { method: 'DELETE' }),
        createRouteContext({ id: '8' })
      ),
      await SET_DEFAULT(post('/api/nexora/models/8/default'), createRouteContext({ id: '8' })),
      await TEST(post('/api/nexora/models/8/test'), createRouteContext({ id: '8' })),
      await PULL(post('/api/nexora/models/ollama/pull', { model: 'qwen2.5:3b' }), {}),
    ]
    expect(responses.map((r) => r.status)).toEqual([403, 403, 403, 403, 403, 403])
    for (const fn of [
      admin.list,
      admin.add,
      admin.remove,
      admin.setDefault,
      admin.test,
      admin.pull,
    ]) {
      expect(fn).not.toHaveBeenCalled()
    }
  })

  it('lists the models with the catalog marked as installed or not', async () => {
    const response = await GET(new NextRequest('http://localhost/api/nexora/models'), {})
    expect(await response.json()).toEqual({
      models: [qwen],
      catalog: [{ name: 'qwen2.5:3b', diskGb: 1.9, memoryGb: 4, paramsB: 3, installed: true }],
      localModels: ['qwen2.5:7b', 'qwen2.5:3b'],
      ollamaAvailable: true,
    })
  })

  it('still lists the models when the bundled Ollama is down', async () => {
    admin.localModels.mockRejectedValue(new OllamaUnavailableError('down'))
    const body = await (await GET(new NextRequest('http://localhost/api/nexora/models'), {})).json()
    expect(body.ollamaAvailable).toBe(false)
    expect(body.models).toEqual([qwen])
  })

  it('answers 503 when the model administration is unavailable', async () => {
    admin.list.mockRejectedValue(new NexoraModelAdminUnavailableError('no key'))
    const response = await GET(new NextRequest('http://localhost/api/nexora/models'), {})
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'unavailable' })
  })

  it('refuses a hostile model name before calling Nexora API or Ollama', async () => {
    for (const body of [
      { source: 'ollama', model: '../etc' },
      { source: 'mistral', model: 'a b', key: 'k' },
      { source: 'openai-compatible', model: 'm', url: 'file:///etc/passwd' },
    ]) {
      expect((await POST(post('/api/nexora/models', body), {})).status).toBe(400)
    }
    expect(
      (await PULL(post('/api/nexora/models/ollama/pull', { model: 'x;rm -rf' }), {})).status
    ).toBe(400)
    expect(admin.add).not.toHaveBeenCalled()
    expect(admin.pull).not.toHaveBeenCalled()
  })

  it('maps refusals to statuses and codes the interface can explain, without echoing the key', async () => {
    const cases: [Error, number, string][] = [
      [new NexoraModelError('duplicate', 'exists'), 409, 'duplicate'],
      [new NexoraModelError('unreachable', 'Model provider not reachable'), 400, 'unreachable'],
      [new NexoraModelError('invalid', 'bad'), 400, 'invalid'],
      [new NexoraModelAdminUnavailableError('down'), 503, 'unavailable'],
    ]
    for (const [error, status, code] of cases) {
      admin.add.mockRejectedValueOnce(error)
      const response = await POST(
        post('/api/nexora/models', {
          source: 'mistral',
          model: 'mistral-small-latest',
          key: 'sk-secret',
        }),
        {}
      )
      expect(response.status).toBe(status)
      const text = await response.text()
      expect(JSON.parse(text).error).toBe(code)
      expect(text).not.toContain('sk-secret')
    }
  })

  it('refuses to remove the default model and deletes a local file only when told to', async () => {
    admin.remove.mockRejectedValueOnce(new NexoraModelError('is-default', 'default'))
    const ctx = createRouteContext({ id: '7' })
    const refused = await DELETE(
      new NextRequest('http://localhost/api/nexora/models/7', { method: 'DELETE' }),
      ctx
    )
    expect([refused.status, (await refused.json()).error]).toEqual([409, 'is-default'])
    expect(admin.deleteLocal).not.toHaveBeenCalled()

    admin.remove.mockResolvedValueOnce({ removedLocalModel: 'qwen2.5:3b' })
    const removed = await DELETE(
      new NextRequest('http://localhost/api/nexora/models/8', { method: 'DELETE' }),
      createRouteContext({ id: '8' })
    )
    expect(await removed.json()).toEqual({ success: true, removedLocalModel: 'qwen2.5:3b' })
    expect(admin.deleteLocal).toHaveBeenCalledWith('qwen2.5:3b')
  })

  it('tests a model by the name blocks use', async () => {
    admin.test.mockResolvedValue({ latencyMs: 812, reply: 'Bonjour' })
    const response = await TEST(post('/api/nexora/models/7/test'), createRouteContext({ id: '7' }))
    expect(await response.json()).toEqual({ latencyMs: 812, reply: 'Bonjour' })
    expect(admin.test).toHaveBeenCalledWith('qwen2.5:7b')
    const missing = await TEST(post('/api/nexora/models/99/test'), createRouteContext({ id: '99' }))
    expect(missing.status).toBe(404)
  })

  it('streams the download progress of a local model', async () => {
    admin.pull.mockResolvedValue(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"done":true}\n\n'))
          controller.close()
        },
      })
    )
    const response = await PULL(post('/api/nexora/models/ollama/pull', { model: 'qwen2.5:3b' }), {})
    expect(response.headers.get('Content-Type')).toContain('text/event-stream')
    expect(await response.text()).toBe('data: {"done":true}\n\n')
  })
})
