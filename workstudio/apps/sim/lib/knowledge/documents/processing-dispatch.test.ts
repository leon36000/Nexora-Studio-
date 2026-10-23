import {
  knowledgeDocumentsServiceMock,
  knowledgeDocumentsServiceMockFns,
} from '@sim/testing/mocks/knowledge-documents-service.mock'
import { outboxServiceMock, outboxServiceMockFns } from '@sim/testing/mocks/outbox-service.mock'
import {
  triggerAvailabilityMock,
  triggerAvailabilityMockFns,
} from '@sim/testing/mocks/trigger-availability.mock'
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  recordUndispatchedDocumentFailure: vi.fn(),
}))

vi.mock('@/lib/knowledge/documents/service', () => knowledgeDocumentsServiceMock)

vi.mock('@/lib/core/config/trigger-availability', () => triggerAvailabilityMock)

vi.mock('@/lib/core/outbox/service', () => outboxServiceMock)

vi.mock('@/lib/knowledge/documents/processing-claim', () => ({
  recordUndispatchedDocumentFailure: mocks.recordUndispatchedDocumentFailure,
}))

import { dispatchDocumentProcessing } from '@/lib/knowledge/documents/processing-dispatch'

const mockProcessDocumentsWithQueue = knowledgeDocumentsServiceMockFns.mockProcessDocumentsWithQueue

const BILLING = {
  actorUserId: 'user-1',
  workspaceId: 'workspace-1',
  organizationId: null,
  billedAccountUserId: 'user-1',
  billingEntity: { id: 'user-1', type: 'user' as const },
  billingPeriod: { start: '2026-10-01', end: '2026-11-01' },
  payerSubscription: null,
}

const DOCUMENTS = [
  {
    documentId: 'document-1',
    filename: 'one.txt',
    fileUrl: 'https://example.com/one.txt',
    fileSize: 3,
    mimeType: 'text/plain',
  },
  {
    documentId: 'document-2',
    filename: 'two.txt',
    fileUrl: 'https://example.com/two.txt',
    fileSize: 3,
    mimeType: 'text/plain',
  },
]

describe('dispatchDocumentProcessing', () => {
  it('records only documents whose returned dispatch outcome failed', async () => {
    mockProcessDocumentsWithQueue.mockResolvedValueOnce({
      requested: 2,
      accepted: 1,
      failed: 1,
      failedDocumentIds: ['document-2'],
    })

    await dispatchDocumentProcessing({
      documents: DOCUMENTS,
      knowledgeBaseId: 'knowledge-base-1',
      processingOptions: {},
      requestId: 'request-1',
      billingAttribution: undefined,
    })

    expect(mocks.recordUndispatchedDocumentFailure).toHaveBeenCalledTimes(1)
    expect(mocks.recordUndispatchedDocumentFailure).toHaveBeenCalledWith({
      documentId: 'document-2',
      knowledgeBaseId: 'knowledge-base-1',
      failureMessage: 'Document processing dispatch was not accepted',
      requestId: 'request-1',
    })
  })

  it('does not turn a partial failure-recording error into a total dispatch failure', async () => {
    mockProcessDocumentsWithQueue.mockResolvedValueOnce({
      requested: 2,
      accepted: 0,
      failed: 2,
      failedDocumentIds: ['document-1', 'document-2'],
    })
    mocks.recordUndispatchedDocumentFailure.mockRejectedValueOnce(new Error('database unavailable'))

    await expect(
      dispatchDocumentProcessing({
        documents: DOCUMENTS,
        knowledgeBaseId: 'knowledge-base-1',
        processingOptions: {},
        requestId: 'request-1',
        billingAttribution: undefined,
      })
    ).resolves.toBeUndefined()

    expect(mocks.recordUndispatchedDocumentFailure).toHaveBeenCalledTimes(2)
    expect(mocks.recordUndispatchedDocumentFailure).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ documentId: 'document-1' })
    )
    expect(mocks.recordUndispatchedDocumentFailure).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ documentId: 'document-2' })
    )
  })

  it('keeps dispatching through Trigger.dev when a job runner is configured', async () => {
    triggerAvailabilityMockFns.mockIsTriggerAvailable.mockReturnValueOnce(true)
    mockProcessDocumentsWithQueue.mockResolvedValueOnce({
      requested: 2,
      accepted: 2,
      failed: 0,
      failedDocumentIds: [],
    })

    await dispatchDocumentProcessing({
      documents: DOCUMENTS,
      knowledgeBaseId: 'knowledge-base-1',
      processingOptions: {},
      requestId: 'request-1',
      billingAttribution: BILLING,
    })

    expect(mockProcessDocumentsWithQueue).toHaveBeenCalledTimes(1)
    expect(outboxServiceMockFns.mockEnqueueOutboxEvent).not.toHaveBeenCalled()
  })

  it('records every document as undispatched when its processing cannot be queued', async () => {
    outboxServiceMockFns.mockEnqueueOutboxEvent.mockRejectedValueOnce(new Error('database down'))

    await expect(
      dispatchDocumentProcessing({
        documents: DOCUMENTS,
        knowledgeBaseId: 'knowledge-base-1',
        processingOptions: {},
        requestId: 'request-1',
        billingAttribution: BILLING,
      })
    ).resolves.toBeUndefined()

    expect(mockProcessDocumentsWithQueue).not.toHaveBeenCalled()
    expect(mocks.recordUndispatchedDocumentFailure).toHaveBeenCalledTimes(2)
    expect(mocks.recordUndispatchedDocumentFailure).toHaveBeenCalledWith(
      expect.objectContaining({ documentId: 'document-2', failureMessage: 'database down' })
    )
  })
})
