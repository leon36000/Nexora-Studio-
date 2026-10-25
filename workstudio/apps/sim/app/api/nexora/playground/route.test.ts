import { authMockFns, createSession } from '@sim/testing'
import { permissionsMock, permissionsMockFns } from '@sim/testing/mocks/permissions.mock'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockStream } = vi.hoisted(() => ({ mockStream: vi.fn() }))

vi.mock('@/lib/workspaces/permissions/utils', () => permissionsMock)
vi.mock('@/lib/nexora/wand', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/nexora/wand')>()),
  nexoraWandStream: mockStream,
}))

import { NexoraWandRejectedError, NexoraWandUnavailableError } from '@/lib/nexora/wand'
import { POST } from '@/app/api/nexora/playground/route'

const body = {
  workspaceId: 'ws-1',
  model: 'vllm/mistral-small-latest',
  messages: [{ role: 'user', content: 'Bonjour' }],
  temperature: 0.7,
  maxTokens: 512,
}

function post(payload: unknown) {
  return new NextRequest('http://localhost/api/nexora/playground', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

describe('POST /api/nexora/playground', () => {
  beforeEach(() => {
    authMockFns.mockGetSession.mockResolvedValue(
      createSession({ userId: 'u-1', email: 'a@pme.fr', name: 'A' })
    )
    permissionsMockFns.mockGetUserEntityPermissions.mockResolvedValue('write')
    mockStream.mockResolvedValue(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"done":true}\n\n'))
          controller.close()
        },
      })
    )
  })

  it('requires a session and membership of the workspace', async () => {
    authMockFns.mockGetSession.mockResolvedValueOnce(null)
    expect((await POST(post(body), {})).status).toBe(401)
    permissionsMockFns.mockGetUserEntityPermissions.mockResolvedValueOnce(null)
    expect((await POST(post(body), {})).status).toBe(403)
    expect(mockStream).not.toHaveBeenCalled()
  })

  it('refuses an invalid request before calling the model', async () => {
    for (const bad of [
      { ...body, messages: [] },
      { ...body, temperature: 3 },
      { ...body, maxTokens: 100_000 },
      { ...body, messages: [{ role: 'tool', content: 'x' }] },
    ]) {
      expect((await POST(post(bad), {})).status).toBe(400)
    }
    expect(mockStream).not.toHaveBeenCalled()
  })

  it('streams the chosen model with its settings and usage', async () => {
    const response = await POST(post(body), {})
    expect(response.headers.get('Content-Type')).toContain('text/event-stream')
    expect(await response.text()).toBe('data: {"done":true}\n\n')
    expect(mockStream).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'mistral-small-latest',
        temperature: 0.7,
        maxTokens: 512,
        reportUsage: true,
        messages: body.messages,
        signal: expect.any(AbortSignal),
        trace: { source: 'playground', workspaceId: 'ws-1', userId: 'u-1', name: 'Playground' },
      })
    )
  })

  it('shows the reasoning apart and passes a chosen reasoning effort, never an empty one', async () => {
    await POST(post({ ...body, reasoningEffort: 'high' }), {})
    expect(mockStream).toHaveBeenLastCalledWith(
      expect.objectContaining({ includeThinking: true, reasoningEffort: 'high' })
    )
    await POST(post(body), {})
    expect(mockStream.mock.lastCall?.[0].reasoningEffort).toBeUndefined()
    expect((await POST(post({ ...body, reasoningEffort: 'extreme' }), {})).status).toBe(400)
  })

  it('answers 503 when Nexora API is unavailable', async () => {
    mockStream.mockRejectedValueOnce(new NexoraWandUnavailableError('down'))
    const response = await POST(post(body), {})
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'unavailable' })
  })

  it('answers 422 with the model’s short reason when the model refuses the request', async () => {
    mockStream.mockRejectedValueOnce(new NexoraWandRejectedError('Model not found'))
    const response = await POST(post(body), {})
    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({ error: 'rejected', reason: 'Model not found' })
  })
})
