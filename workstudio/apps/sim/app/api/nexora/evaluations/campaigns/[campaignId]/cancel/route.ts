import { cancelEvalCampaignContract } from '@/lib/api/contracts/nexora-evaluations'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { cancelCampaignUseCase } from '@/lib/nexora/evaluations/application/use-cases'
import { presentCampaign } from '@/app/api/nexora/evaluations/surface'

export const dynamic = 'force-dynamic'

/** Cancels a pending or running campaign. */
export const POST = defineInternalJsonRoute({
  contract: cancelEvalCampaignContract,
  operation: cancelCampaignUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.evaluations.write' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ params, body }) => ({
    workspaceId: body.workspaceId,
    campaignId: params.campaignId,
  }),
  useCase: cancelCampaignUseCase,
  present: (campaign) => ({ campaign: presentCampaign(campaign) }),
})
