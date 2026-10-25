import { authInternalMock } from '@sim/testing/mocks/auth-internal.mock'
import { fileParsersMock } from '@sim/testing/mocks/file-parsers.mock'
import {
  fileUtilsServerMock,
  fileUtilsServerMockFns,
} from '@sim/testing/mocks/file-utils-server.mock'
import {
  nexoraDataProtectionMock,
  nexoraDataProtectionMockFns,
} from '@sim/testing/mocks/nexora-data-protection.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockReadImage, mockTranscribe, mockModel, mockOffInstance } = vi.hoisted(() => ({
  mockReadImage: vi.fn(),
  mockTranscribe: vi.fn(),
  mockModel: vi.fn(),
  mockOffInstance: vi.fn(),
}))

vi.mock('@/lib/auth/internal', () => authInternalMock)
vi.mock('@/lib/file-parsers', () => fileParsersMock)
vi.mock('@/lib/uploads/utils/file.server', () => fileUtilsServerMock)
vi.mock('@/lib/nexora/data-protection/policy', () => nexoraDataProtectionMock)
vi.mock('@/lib/nexora/data-protection/model-location', () => ({
  isOffInstanceModel: mockOffInstance,
}))
vi.mock('@/lib/knowledge/documents/nexora-extraction', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/knowledge/documents/nexora-extraction')>()),
  isNexoraDocumentAiConfigured: () => true,
  resolveNexoraKnowledgeModel: mockModel,
  readImageWithNexora: mockReadImage,
  transcribeForKnowledge: mockTranscribe,
}))

import { env } from '@/lib/core/config/env'
import { processDocument } from '@/lib/knowledge/documents/processor'
import { runWithKnowledgeModelInputProvenance } from '@/lib/knowledge/model-input-provenance'

const PNG = Buffer.from('synthetic image')

function index(filename: string, mimeType: string, workspaceId: string) {
  return runWithKnowledgeModelInputProvenance(
    undefined,
    () =>
      processDocument(
        `https://example.com/${filename}`,
        filename,
        mimeType,
        1024,
        200,
        1,
        { userId: 'user-1' },
        workspaceId
      ),
    { opaqueInputSafe: true }
  )
}

describe('knowledge base documents read by Nexora models — personal-data policy', () => {
  beforeEach(() => {
    Object.assign(env, { OCR_PROVIDER: 'local', MISTRAL_API_KEY: '' })
    fileUtilsServerMockFns.mockDownloadFileFromUrl.mockResolvedValue(PNG)
    mockModel.mockResolvedValue('mistral-ocr')
    mockOffInstance.mockResolvedValue(true)
    mockReadImage.mockResolvedValue('Facture, IBAN FR76 3000 6000 0112 3456 7890 189')
    mockTranscribe.mockResolvedValue('Bonjour Marie Dupont')
    nexoraDataProtectionMockFns.mockLoadDataProtection.mockResolvedValue({
      defaultMode: 'allow',
      workspaceModes: { 'ws-mask': 'mask', 'ws-refuse': 'refuse' },
    })
  })

  it.each(['ws-mask', 'ws-refuse'])(
    'does not send a scan to a model off the instance from workspace %s',
    async (workspaceId) => {
      await expect(index('facture.png', 'image/png', workspaceId)).rejects.toThrow(
        /données personnelles/
      )
      expect(mockReadImage).not.toHaveBeenCalled()
    }
  )

  it.each(['ws-mask', 'ws-refuse'])(
    'does not send a recording to a model off the instance from workspace %s',
    async (workspaceId) => {
      await expect(index('reunion.mp3', 'audio/mpeg', workspaceId)).rejects.toThrow(
        /données personnelles/
      )
      expect(mockTranscribe).not.toHaveBeenCalled()
    }
  )

  it('reads both for a workspace that allows personal data', async () => {
    await index('facture.png', 'image/png', 'ws-open')
    await index('reunion.mp3', 'audio/mpeg', 'ws-open')
    expect(mockReadImage).toHaveBeenCalledTimes(1)
    expect(mockTranscribe).toHaveBeenCalledTimes(1)
  })

  it('reads both with a model on this server whatever the policy', async () => {
    mockOffInstance.mockResolvedValue(false)
    await index('facture.png', 'image/png', 'ws-refuse')
    await index('reunion.mp3', 'audio/mpeg', 'ws-refuse')
    expect(mockReadImage).toHaveBeenCalledTimes(1)
    expect(mockTranscribe).toHaveBeenCalledTimes(1)
  })
})
