import { deleteBatchContract, getBatchContract } from '@/lib/api/contracts/nexora-batches'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { deleteBatchUseCase, readBatchUseCase } from '@/lib/nexora/batches/application/use-cases'

export const dynamic = 'force-dynamic'

const DEFAULT_PAGE = 100

/** One batch with a page of its results, after a position (-1 for the start). */
export const GET = defineInternalJsonRoute({
  contract: getBatchContract,
  operation: readBatchUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.none({ reason: 'Polled every few seconds while a batch runs' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ params, query }) => ({
    workspaceId: query.workspaceId,
    batchId: params.batchId,
    after: query.after ?? -1,
    limit: query.limit ?? DEFAULT_PAGE,
  }),
  useCase: readBatchUseCase,
  present: (result) => result,
})

/** Deletes a batch that has ended, with its results. */
export const DELETE = defineInternalJsonRoute({
  contract: deleteBatchContract,
  operation: deleteBatchUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.batches.write' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ params, query }) => ({ workspaceId: query.workspaceId, batchId: params.batchId }),
  useCase: deleteBatchUseCase,
  present: () => ({ success: true as const }),
})
