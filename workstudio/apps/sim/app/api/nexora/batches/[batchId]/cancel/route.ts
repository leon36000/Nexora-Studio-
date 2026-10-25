import { cancelBatchContract } from '@/lib/api/contracts/nexora-batches'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { cancelBatchUseCase } from '@/lib/nexora/batches/application/use-cases'

export const dynamic = 'force-dynamic'

/** Cancels a running batch: the calls in flight stop, the answers already written stay. */
export const POST = defineInternalJsonRoute({
  contract: cancelBatchContract,
  operation: cancelBatchUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.batches.write' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ params, body }) => ({ workspaceId: body.workspaceId, batchId: params.batchId }),
  useCase: cancelBatchUseCase,
  present: (batch) => ({ batch }),
})
