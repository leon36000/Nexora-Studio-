import {
  createEvalCampaignContract,
  listEvalCampaignsContract,
} from '@/lib/api/contracts/nexora-evaluations'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import {
  launchCampaignUseCase,
  listCampaignsUseCase,
} from '@/lib/nexora/evaluations/application/use-cases'
import { presentCampaign, presentCampaignListEntry } from '@/app/api/nexora/evaluations/surface'

export const dynamic = 'force-dynamic'

/** The workspace's campaigns, newest first, with their progress. */
export const GET = defineInternalJsonRoute({
  contract: listEvalCampaignsContract,
  operation: listCampaignsUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.none({ reason: 'Read issued when the Evaluations page opens' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ query }) => ({ workspaceId: query.workspaceId }),
  useCase: listCampaignsUseCase,
  present: (campaigns) => ({ campaigns: campaigns.map(presentCampaignListEntry) }),
})

/** Creates a campaign and starts it in the background. */
export const POST = defineInternalJsonRoute({
  contract: createEvalCampaignContract,
  operation: launchCampaignUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.evaluations.launch' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ body }) => body,
  useCase: launchCampaignUseCase,
  present: (campaign) => ({ campaign: presentCampaign(campaign) }),
})
