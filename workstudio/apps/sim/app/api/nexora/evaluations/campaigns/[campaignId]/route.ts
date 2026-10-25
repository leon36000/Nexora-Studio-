import {
  deleteEvalCampaignContract,
  getEvalCampaignContract,
} from '@/lib/api/contracts/nexora-evaluations'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import {
  deleteCampaignUseCase,
  readCampaignUseCase,
} from '@/lib/nexora/evaluations/application/use-cases'
import { presentCampaign, presentItem } from '@/app/api/nexora/evaluations/surface'

export const dynamic = 'force-dynamic'

/** A campaign with its statistics per target and its items. */
export const GET = defineInternalJsonRoute({
  contract: getEvalCampaignContract,
  operation: readCampaignUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.none({ reason: 'Read issued when the Evaluations page opens' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ params, query }) => ({
    workspaceId: query.workspaceId,
    campaignId: params.campaignId,
  }),
  useCase: readCampaignUseCase,
  present: ({ campaign, datasetName, judgeName, summaries, items }) => ({
    campaign: presentCampaign(campaign),
    datasetName,
    judgeName,
    summaries,
    items: items.map(presentItem),
  }),
})

/** Deletes a finished campaign. */
export const DELETE = defineInternalJsonRoute({
  contract: deleteEvalCampaignContract,
  operation: deleteCampaignUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.evaluations.write' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ params, query }) => ({
    workspaceId: query.workspaceId,
    campaignId: params.campaignId,
  }),
  useCase: deleteCampaignUseCase,
  present: () => ({ success: true as const }),
})
