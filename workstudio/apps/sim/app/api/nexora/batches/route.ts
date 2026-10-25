import { createBatchContract, listBatchesContract } from '@/lib/api/contracts/nexora-batches'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { launchBatchUseCase, listBatchesUseCase } from '@/lib/nexora/batches/application/use-cases'

export const dynamic = 'force-dynamic'

/** The workspace's batches (made here or through the API), newest first. */
export const GET = defineInternalJsonRoute({
  contract: listBatchesContract,
  operation: listBatchesUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.none({ reason: 'Read issued when the batches page opens' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ query }) => ({ workspaceId: query.workspaceId }),
  useCase: listBatchesUseCase,
  present: (batches) => ({ batches }),
})

/** Creates a batch over the rows of a table and starts it in the background. */
export const POST = defineInternalJsonRoute({
  contract: createBatchContract,
  operation: launchBatchUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.batches.launch' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ body }) => body,
  useCase: launchBatchUseCase,
  present: (batch) => ({ batch }),
})
