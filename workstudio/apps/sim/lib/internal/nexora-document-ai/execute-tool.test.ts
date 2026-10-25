/**
 * @vitest-environment node
 */
import {
  nexoraDataProtectionMock,
  nexoraDataProtectionMockFns,
} from '@sim/testing/mocks/nexora-data-protection.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockOcr,
  mockVision,
  mockExtract,
  mockTranscribe,
  mockMeeting,
  mockResolve,
  mockOffInstance,
} = vi.hoisted(() => ({
  mockOcr: vi.fn(),
  mockVision: vi.fn(),
  mockExtract: vi.fn(),
  mockTranscribe: vi.fn(),
  mockMeeting: vi.fn(),
  mockResolve: vi.fn(),
  mockOffInstance: vi.fn(),
}))

vi.mock('@/lib/nexora/data-protection/policy', () => nexoraDataProtectionMock)
vi.mock('@/lib/nexora/data-protection/model-location', () => ({
  isOffInstanceModel: mockOffInstance,
}))
vi.mock('@/lib/nexora/document-ai/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/nexora/document-ai/client')>()),
  resolveUsageModel: mockResolve,
}))
vi.mock('@/lib/nexora/document-ai/ocr', () => ({ ocrDocument: mockOcr }))
vi.mock('@/lib/nexora/document-ai/vision', () => ({ describeImage: mockVision }))
vi.mock('@/lib/nexora/document-ai/extraction', () => ({ extractDocumentData: mockExtract }))
vi.mock('@/lib/nexora/document-ai/transcription', () => ({
  transcribeWithNexora: mockTranscribe,
  transcribeMeetingWithNexora: mockMeeting,
}))

import { executeNexoraDocumentAiTool } from '@/lib/internal/nexora-document-ai/execute-tool'

const file = {
  name: 'scan.png',
  size: 4,
  key: 'workspace/ws-1/scan.png',
  base64: 'AAAA',
  type: 'image/png',
}

function call(
  toolId: string,
  input: Record<string, unknown>,
  workspaceId: string | undefined = 'ws-1'
) {
  return executeNexoraDocumentAiTool({
    toolId,
    input,
    headers: new Headers(),
    context: { workflowId: 'wf-1', workspaceId, userId: 'user-1' },
    requestId: 'req-1',
  })
}

const documentTools: Array<[string, Record<string, unknown>, ReturnType<typeof vi.fn>]> = [
  ['vision_nexora', { imageFile: file }, mockVision],
  ['ocr_nexora', { file }, mockOcr],
  ['nexora_extract', { file, fields: [{ name: 'total', type: 'number' }] }, mockExtract],
  ['stt_nexora', { audioFile: file }, mockTranscribe],
]

describe('Nexora document AI tools — personal-data policy', () => {
  beforeEach(() => {
    mockResolve.mockImplementation(
      async (_usage: string, requested: string | null) => requested ?? 'ocr-externe'
    )
    mockOffInstance.mockResolvedValue(true)
    mockVision.mockResolvedValue({ content: 'ok', model: 'm' })
    mockOcr.mockResolvedValue({ pages: [] })
    mockExtract.mockResolvedValue({ row: {} })
    mockTranscribe.mockResolvedValue({ transcript: 'ok' })
    nexoraDataProtectionMockFns.mockLoadDataProtection.mockResolvedValue({
      defaultMode: 'allow',
      workspaceModes: { 'ws-mask': 'mask', 'ws-refuse': 'refuse' },
    })
  })

  it.each(documentTools)(
    '%s: refuses a model off the instance in a workspace that protects personal data',
    async (toolId, input, reader) => {
      for (const workspace of ['ws-mask', 'ws-refuse']) {
        const response = await call(toolId, input, workspace)
        expect(response.status).toBe(403)
        expect(await response.json()).toMatchObject({
          success: false,
          error: expect.stringContaining('données personnelles'),
        })
      }
      expect(reader).not.toHaveBeenCalled()
    }
  )

  it.each(documentTools)(
    '%s: reads the document for a workspace that allows personal data',
    async (toolId, input, reader) => {
      const response = await call(toolId, input, 'ws-1')
      expect(response.status).toBe(200)
      expect(reader).toHaveBeenCalledTimes(1)
    }
  )

  it.each(documentTools)(
    '%s: reads the document with a model on this server whatever the policy',
    async (toolId, input, reader) => {
      mockOffInstance.mockResolvedValue(false)
      const response = await call(toolId, input, 'ws-refuse')
      expect(response.status).toBe(200)
      expect(reader).toHaveBeenCalledTimes(1)
    }
  )

  it('nexora_extract: also refuses when only the chat model that fills the schema is off the instance', async () => {
    mockOffInstance.mockImplementation(async (model: string) => model === 'cloud-glm-5-3')
    const response = await call(
      'nexora_extract',
      {
        file,
        fields: [{ name: 'total', type: 'number' }],
        visionModel: 'glm-ocr',
        model: 'vllm/cloud-glm-5-3',
      },
      'ws-refuse'
    )
    expect(response.status).toBe(403)
    expect(mockExtract).not.toHaveBeenCalled()
  })

  it('answers 503 and reads nothing when the policy cannot be read', async () => {
    nexoraDataProtectionMockFns.mockLoadDataProtection.mockRejectedValue(new Error('database down'))
    const response = await call('ocr_nexora', { file }, 'ws-mask')
    expect(response.status).toBe(503)
    expect(mockOcr).not.toHaveBeenCalled()
  })
})
