import {
  getKnowledgeReindexContract,
  startKnowledgeReindexContract,
} from '@/lib/api/contracts/knowledge'
import {
  defineInternalJsonRoute,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { internalKnowledgeErrorPolicies } from '@/lib/knowledge/api/route-policies'
import { knowledgeOperations } from '@/lib/knowledge/application/operations'
import {
  readKnowledgeReindex,
  startKnowledgeReindexOperation,
} from '@/lib/knowledge/application/reindex'
import type { KnowledgeReindexView } from '@/lib/knowledge/reindex/service'

function presentView(view: KnowledgeReindexView) {
  return {
    success: true as const,
    data: {
      embeddingModel: view.embeddingModel,
      embeddingDimension: view.embeddingDimension,
      documentCount: view.documentCount,
      chunkCount: view.chunkCount,
      reindex: view.reindex
        ? {
            status: view.reindex.status,
            sourceModel: view.reindex.sourceModel,
            targetModel: view.reindex.targetModel,
            targetDimension: view.reindex.targetDimension,
            totalChunks: view.reindex.totalChunks,
            embeddedChunks: view.reindex.embeddedChunks,
            errorCode: view.reindex.errorCode,
            error: view.reindex.error,
            startedAt: view.reindex.startedAt.toISOString(),
            completedAt: view.reindex.completedAt?.toISOString() ?? null,
            stalled: view.reindex.stalled,
          }
        : null,
    },
  }
}

export const GET = defineInternalJsonRoute({
  contract: getKnowledgeReindexContract,
  auth: internalSessionAuth,
  operation: knowledgeOperations.readReindex,
  rateLimit: internalRateLimits.none({
    reason: 'Polled by the knowledge page while a reindex runs',
  }),
  errorPolicy: internalKnowledgeErrorPolicies.read,
  mapInput: ({ params }) => ({ knowledgeBaseId: params.id }),
  useCase: readKnowledgeReindex,
  present: presentView,
})

export const POST = defineInternalJsonRoute({
  contract: startKnowledgeReindexContract,
  auth: internalSessionAuth,
  operation: knowledgeOperations.reindex,
  rateLimit: internalRateLimits.none({
    reason: 'One reindex per base at a time, refused while one runs',
  }),
  errorPolicy: internalKnowledgeErrorPolicies.update,
  mapInput: ({ params, body }) => ({ knowledgeBaseId: params.id, model: body.model }),
  useCase: startKnowledgeReindexOperation,
  present: ({ view }) => presentView(view),
})
