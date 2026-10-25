/**
 * @vitest-environment node
 */
import { authMockFns, createSession } from '@sim/testing'
import { permissionsMock, permissionsMockFns } from '@sim/testing/mocks/permissions.mock'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockTranscribe } = vi.hoisted(() => ({ mockTranscribe: vi.fn() }))

vi.mock('@/lib/workspaces/permissions/utils', () => permissionsMock)
vi.mock('@/lib/nexora/document-ai/transcription', () => ({
  transcribeWithNexora: mockTranscribe,
}))

import { NexoraDocumentAiError } from '@/lib/nexora/document-ai/client'
import { POST } from '@/app/api/nexora/assistant/voice/dictate/route'

function dictation(fields: { workspaceId?: string; file?: File | null; language?: string }) {
  const form = new FormData()
  if (fields.workspaceId !== undefined) form.set('workspaceId', fields.workspaceId)
  if (fields.file) form.set('file', fields.file)
  if (fields.language) form.set('language', fields.language)
  return new NextRequest('http://localhost/api/nexora/assistant/voice/dictate', {
    method: 'POST',
    body: form,
  })
}

const recording = () => new File([new Uint8Array(2048)], 'dictee.webm', { type: 'audio/webm' })

describe('POST /api/nexora/assistant/voice/dictate', () => {
  beforeEach(() => {
    authMockFns.mockGetSession.mockResolvedValue(
      createSession({ userId: 'u-1', email: 'a@pme.fr', name: 'A' })
    )
    permissionsMockFns.mockGetUserEntityPermissions.mockResolvedValue('read')
    mockTranscribe.mockResolvedValue({ transcript: ' Bonjour Marie. ', model: 'whisper-small' })
  })

  it('transcribes the recording in French by default and returns its text', async () => {
    const response = await POST(dictation({ workspaceId: 'ws-1', file: recording() }), {})

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ text: 'Bonjour Marie.' })
    const [input] = mockTranscribe.mock.calls[0]
    expect(input).toMatchObject({
      mimeType: 'audio/webm',
      fileName: 'dictee.webm',
      language: 'fr',
    })
    expect(input.audio).toHaveLength(2048)
  })

  it('takes the language of the page when it is one it knows, else French', async () => {
    await POST(dictation({ workspaceId: 'ws-1', file: recording(), language: 'en' }), {})
    await POST(dictation({ workspaceId: 'ws-1', file: recording(), language: 'klingon' }), {})
    expect(mockTranscribe.mock.calls.map(([input]) => input.language)).toEqual(['en', 'fr'])
  })

  it('answers members of the workspace only', async () => {
    authMockFns.mockGetSession.mockResolvedValueOnce(null)
    expect((await POST(dictation({ workspaceId: 'ws-1', file: recording() }), {})).status).toBe(401)
    permissionsMockFns.mockGetUserEntityPermissions.mockResolvedValueOnce(null)
    expect((await POST(dictation({ workspaceId: 'ws-1', file: recording() }), {})).status).toBe(403)
    expect((await POST(dictation({ file: recording() }), {})).status).toBe(400)
    expect(mockTranscribe).not.toHaveBeenCalled()
  })

  it('refuses an empty recording before transcribing anything', async () => {
    const empty = new File([], 'dictee.webm', { type: 'audio/webm' })
    const response = await POST(dictation({ workspaceId: 'ws-1', file: empty }), {})
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: 'empty' })
    expect((await POST(dictation({ workspaceId: 'ws-1' }), {})).status).toBe(400)
    expect(mockTranscribe).not.toHaveBeenCalled()
  })

  it('tells the page why it could not transcribe, by code', async () => {
    mockTranscribe.mockRejectedValueOnce(new NexoraDocumentAiError('no-model', 'No model'))
    const response = await POST(dictation({ workspaceId: 'ws-1', file: recording() }), {})
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: 'no-model' })
  })
})
