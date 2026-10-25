/**
 * @vitest-environment node
 */
import { authMockFns, createSession } from '@sim/testing'
import { permissionsMock, permissionsMockFns } from '@sim/testing/mocks/permissions.mock'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockSpeak, mockResolve } = vi.hoisted(() => ({
  mockSpeak: vi.fn(),
  mockResolve: vi.fn(),
}))

vi.mock('@/lib/workspaces/permissions/utils', () => permissionsMock)
vi.mock('@/lib/nexora/voice/client', () => ({
  nexoraSpeak: mockSpeak,
  MAX_SPEECH_CHARACTERS: 4096,
}))
vi.mock('@/lib/nexora/document-ai/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/nexora/document-ai/client')>()),
  resolveUsageModel: mockResolve,
}))

import { NexoraDocumentAiError } from '@/lib/nexora/document-ai/client'
import { POST } from '@/app/api/nexora/assistant/voice/speak/route'

const WAV = Buffer.from([82, 73, 70, 70, 1, 2])

function post(payload: unknown) {
  return new NextRequest('http://localhost/api/nexora/assistant/voice/speak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

describe('POST /api/nexora/assistant/voice/speak', () => {
  beforeEach(() => {
    authMockFns.mockGetSession.mockResolvedValue(
      createSession({ userId: 'u-1', email: 'a@pme.fr', name: 'A' })
    )
    permissionsMockFns.mockGetUserEntityPermissions.mockResolvedValue('read')
    mockResolve.mockResolvedValue('piper-fr-fr-siwis-medium')
    mockSpeak.mockResolvedValue({ audio: WAV, mimeType: 'audio/wav' })
  })

  it('says the text with the first voice model and returns the audio', async () => {
    const response = await POST(post({ workspaceId: 'ws-1', text: 'Bonjour à tous.' }), {})

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('audio/wav')
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array(WAV))
    expect(mockResolve).toHaveBeenCalledWith('speech', undefined, expect.anything())
    expect(mockSpeak).toHaveBeenCalledWith(
      { text: 'Bonjour à tous.', model: 'piper-fr-fr-siwis-medium', format: 'wav' },
      expect.anything()
    )
  })

  it('answers members of the workspace only, even to read', async () => {
    authMockFns.mockGetSession.mockResolvedValueOnce(null)
    expect((await POST(post({ workspaceId: 'ws-1', text: 'Bonjour' }), {})).status).toBe(401)
    permissionsMockFns.mockGetUserEntityPermissions.mockResolvedValueOnce(null)
    expect((await POST(post({ workspaceId: 'ws-1', text: 'Bonjour' }), {})).status).toBe(403)
    expect(mockSpeak).not.toHaveBeenCalled()
  })

  it('refuses an empty or oversized text before calling the voice', async () => {
    for (const text of ['   ', 'x'.repeat(2401)]) {
      expect((await POST(post({ workspaceId: 'ws-1', text }), {})).status).toBe(400)
    }
    expect(mockSpeak).not.toHaveBeenCalled()
  })

  it('tells the page why it cannot speak, by code, so it words it in French', async () => {
    mockResolve.mockRejectedValueOnce(new NexoraDocumentAiError('no-model', 'No speech model'))
    const noModel = await POST(post({ workspaceId: 'ws-1', text: 'Bonjour' }), {})
    expect(noModel.status).toBe(400)
    expect(await noModel.json()).toMatchObject({ error: 'no-model' })

    mockSpeak.mockRejectedValueOnce(new NexoraDocumentAiError('unavailable', 'down'))
    const down = await POST(post({ workspaceId: 'ws-1', text: 'Bonjour' }), {})
    expect(down.status).toBe(502)
    expect(await down.json()).toMatchObject({ error: 'unavailable' })
  })
})
