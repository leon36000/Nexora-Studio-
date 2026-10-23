import { db } from '@sim/db'
import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import type { BillingAttributionSnapshot } from '@/lib/billing/core/attribution'
import { isTriggerAvailable } from '@/lib/core/config/trigger-availability'
import { processOutboxEventById } from '@/lib/core/outbox/service'
import { recordUndispatchedDocumentFailure } from '@/lib/knowledge/documents/processing-claim'
import { enqueueKnowledgeDocumentProcessing } from '@/lib/knowledge/documents/processing-outbox-event'
import {
  type DocumentData,
  type ProcessingOptions,
  processDocumentsWithQueue,
} from '@/lib/knowledge/documents/service'

interface DispatchDocumentProcessingParams {
  documents: DocumentData[]
  knowledgeBaseId: string
  processingOptions: ProcessingOptions
  requestId: string
  billingAttribution: BillingAttributionSnapshot | undefined
}

const logger = createLogger('DocumentProcessingDispatch')

async function recordDispatchFailures({
  documentIds,
  knowledgeBaseId,
  failureMessage,
  requestId,
}: {
  documentIds: string[]
  knowledgeBaseId: string
  failureMessage: string
  requestId: string
}): Promise<void> {
  for (const documentId of documentIds) {
    try {
      await recordUndispatchedDocumentFailure({
        documentId,
        knowledgeBaseId,
        failureMessage,
        requestId,
      })
    } catch (error) {
      logger.error('Failed to record an undispatched knowledge document', {
        documentId,
        knowledgeBaseId,
        error: getErrorMessage(error),
      })
    }
  }
}

/**
 * Nexora edition: with no job runner, documents are handed to the outbox worker instead of being
 * processed inside the request that registered them. Processing begun in a request was tied to its
 * lifetime: a scan or a recording read for minutes was cut after five, and the upload completion
 * answered only once the document was indexed. The outbox runs the same in-process dispatch, with
 * its own deadline and continuations, and the request answers once the events are written.
 */
async function enqueueDocumentProcessing(
  documents: DocumentData[],
  knowledgeBaseId: string,
  processingOptions: ProcessingOptions,
  billingAttribution: BillingAttributionSnapshot
): Promise<string[]> {
  return db.transaction(async (tx) => {
    const eventIds: string[] = []
    for (const document of documents) {
      eventIds.push(
        await enqueueKnowledgeDocumentProcessing(tx, {
          knowledgeBaseId,
          documentId: document.documentId,
          processingOptions,
          billingAttribution,
          processingLane: 'interactive',
        })
      )
    }
    return eventIds
  })
}

/**
 * Starts the committed events now, beside the caller, instead of at the processor's next pass (up
 * to a minute later, or after a long scan it is reading). The outbox stays the owner: the claim is
 * its own, an event the document lane has no room for stays pending for the processor, and one
 * whose start fails is retried there like any other.
 */
function startQueuedDocumentProcessing(eventIds: string[]): void {
  void (async () => {
    const { knowledgeDocumentProcessingOutboxHandlers } = await import(
      '@/lib/knowledge/documents/processing-outbox-handler'
    )
    await Promise.all(
      eventIds.map(async (eventId) => {
        try {
          await processOutboxEventById(eventId, knowledgeDocumentProcessingOutboxHandlers)
        } catch (error) {
          logger.warn('Queued knowledge document could not start early; the outbox will run it', {
            eventId,
            error: getErrorMessage(error),
          })
        }
      })
    )
  })().catch((error) => {
    logger.warn('Queued knowledge documents could not start early; the outbox will run them', {
      error: getErrorMessage(error),
    })
  })
}

/**
 * Dispatches document processing and records the failure against every document
 * it stranded, rather than only logging it.
 *
 * The wrapper lives beside the callers rather than inside
 * `processDocumentsWithQueue` deliberately. Two of that function's callers must
 * NOT unwind: the connector sweep swallows dispatch failure so its documents
 * stay reclaimable by the next sync, and the outbox handler lets the throw
 * propagate so the relay retries it. A write inside the funnel would break both.
 *
 * Never throws. Every caller here dispatches fire-and-forget after its own
 * response has been decided, so there is no one left to handle a rejection.
 */
export async function dispatchDocumentProcessing({
  documents,
  knowledgeBaseId,
  processingOptions,
  requestId,
  billingAttribution,
}: DispatchDocumentProcessingParams): Promise<void> {
  if (documents.length === 0) return

  let failedDocumentIds: string[]
  let failureMessage: string
  try {
    if (billingAttribution && !isTriggerAvailable()) {
      startQueuedDocumentProcessing(
        await enqueueDocumentProcessing(
          documents,
          knowledgeBaseId,
          processingOptions,
          billingAttribution
        )
      )
      return
    }
    const dispatch = await processDocumentsWithQueue(
      documents,
      knowledgeBaseId,
      processingOptions,
      requestId,
      billingAttribution,
      'interactive'
    )
    failedDocumentIds = dispatch.failedDocumentIds
    failureMessage = 'Document processing dispatch was not accepted'
  } catch (error) {
    failedDocumentIds = documents.map((document) => document.documentId)
    failureMessage = getErrorMessage(error, 'Document processing dispatch failed')
  }

  await recordDispatchFailures({
    documentIds: failedDocumentIds,
    knowledgeBaseId,
    failureMessage,
    requestId,
  })
}
