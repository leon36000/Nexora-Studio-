import { storageServiceMockFns } from '@sim/testing/mocks/storage-service.mock'
import { uploadsMock } from '@sim/testing/mocks/uploads.mock'
import {
  uploadsExecutionMock,
  uploadsExecutionMockFns,
} from '@sim/testing/mocks/uploads-execution.mock'
import { resetUrlsMock, urlsMockFns } from '@sim/testing/mocks/urls.mock'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  nexoraSpeak: vi.fn(),
  resolveUsageModel: vi.fn(),
}))

vi.mock('@/lib/nexora/voice/client', () => ({ nexoraSpeak: mocks.nexoraSpeak }))
vi.mock('@/lib/nexora/document-ai/client', () => ({
  resolveUsageModel: mocks.resolveUsageModel,
}))
vi.mock('@/lib/uploads/contexts/execution', () => uploadsExecutionMock)
vi.mock('@/lib/uploads', () => uploadsMock)

import { executeNexoraTts } from '@/lib/internal/tts/operations'

const { mockUploadExecutionFile } = uploadsExecutionMockFns
const { mockUploadFile } = storageServiceMockFns

const SPEECH = { audio: Buffer.from('RIFF....WAVE'), mimeType: 'audio/wav' }

describe('executeNexoraTts', () => {
  afterAll(resetUrlsMock)

  beforeEach(() => {
    urlsMockFns.mockGetBaseUrl.mockReturnValue('https://nexora.example')
    mocks.resolveUsageModel.mockResolvedValue('piper-fr-fr-siwis-medium')
    mocks.nexoraSpeak.mockResolvedValue(SPEECH)
    mockUploadExecutionFile.mockResolvedValue({
      id: 'file-1',
      name: 'tts-nexora.wav',
      url: 'https://execution.example/tts-nexora.wav',
      size: SPEECH.audio.length,
      type: 'audio/wav',
      key: 'execution/tts-nexora.wav',
    })
    mockUploadFile.mockResolvedValue({
      key: 'copilot/tts-nexora.wav',
      path: '/api/files/serve/copilot/tts-nexora.wav',
      size: SPEECH.audio.length,
    })
  })

  it('reads the text with the first Speech synthesis model when none is named, and stores a WAV', async () => {
    const result = await executeNexoraTts(
      { text: 'Bonjour à tous' },
      { requestId: 'request-1', userId: 'user-1' }
    )

    expect(mocks.resolveUsageModel).toHaveBeenCalledWith('speech', undefined, expect.anything())
    expect(mocks.nexoraSpeak).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Bonjour à tous', model: 'piper-fr-fr-siwis-medium' }),
      expect.anything()
    )
    expect(mockUploadFile).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: 'audio/wav', file: SPEECH.audio })
    )
    expect(result).toEqual({
      audioUrl: 'https://nexora.example/api/files/serve/copilot/tts-nexora.wav',
      characterCount: 14,
      format: 'wav',
      provider: 'nexora',
    })
  })

  it('keeps the file in the execution when the block runs in a workflow', async () => {
    const result = await executeNexoraTts(
      { text: 'Bonjour', model: 'piper', voice: 'siwis', responseFormat: 'mp3', speed: 1.2 },
      {
        requestId: 'request-1',
        userId: 'user-1',
        workspaceId: 'ws-1',
        workflowId: 'wf-1',
        executionId: 'ex-1',
      }
    )

    expect(mocks.resolveUsageModel).toHaveBeenCalledWith('speech', 'piper', expect.anything())
    expect(mocks.nexoraSpeak).toHaveBeenCalledWith(
      expect.objectContaining({ voice: 'siwis', format: 'mp3', speed: 1.2 }),
      expect.anything()
    )
    expect(mockUploadFile).not.toHaveBeenCalled()
    expect(result).toMatchObject({ audioUrl: 'https://execution.example/tts-nexora.wav', provider: 'nexora' })
  })
})
