import { listBatchSourcesContract } from '@/lib/api/contracts/nexora-batches'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { listSourcesUseCase } from '@/lib/nexora/batches/application/use-cases'

export const dynamic = 'force-dynamic'

/** The workspace's tables with their columns: what a new batch can process. */
export const GET = defineInternalJsonRoute({
  contract: listBatchSourcesContract,
  operation: listSourcesUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.none({ reason: 'Read issued when the creation form opens' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ query }) => ({ workspaceId: query.workspaceId }),
  useCase: listSourcesUseCase,
  present: (tables) => ({ tables }),
})
