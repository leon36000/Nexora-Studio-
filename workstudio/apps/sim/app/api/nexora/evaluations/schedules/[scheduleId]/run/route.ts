import { runEvalScheduleContract } from '@/lib/api/contracts/nexora-evaluations'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { runScheduleUseCase } from '@/lib/nexora/evaluations/application/use-cases'
import { presentCampaign } from '@/app/api/nexora/evaluations/surface'

export const dynamic = 'force-dynamic'

/** Runs a schedule's campaign now. */
export const POST = defineInternalJsonRoute({
  contract: runEvalScheduleContract,
  operation: runScheduleUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.evaluations.launch' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ params, body }) => ({
    workspaceId: body.workspaceId,
    scheduleId: params.scheduleId,
  }),
  useCase: runScheduleUseCase,
  present: (campaign) => ({ campaign: presentCampaign(campaign) }),
})
