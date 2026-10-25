import { compareEvalCampaignsContract } from '@/lib/api/contracts/nexora-evaluations'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { compareCampaignsUseCase } from '@/lib/nexora/evaluations/application/use-cases'

export const dynamic = 'force-dynamic'

/** Two series compared row by row. */
export const GET = defineInternalJsonRoute({
  contract: compareEvalCampaignsContract,
  operation: compareCampaignsUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.none({ reason: 'Read issued when the Evaluations page opens' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ query }) => query,
  useCase: compareCampaignsUseCase,
  present: (comparison) => comparison,
})
