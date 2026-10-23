import { generateCopilotPlanContract } from '@/lib/api/contracts/nexora-copilot'
import { defineInternalJsonRoute, internalSessionAuth } from '@/lib/api/server/routes'
import { generateCopilotPlan } from '@/lib/nexora/copilot'
import { copilotErrorPolicy, copilotRateLimit } from '@/app/api/nexora/copilot/surface'

/** Drafts a workflow plan with the Nexora model; nothing is created until « Créer ». */
export const POST = defineInternalJsonRoute({
  contract: generateCopilotPlanContract,
  operation: generateCopilotPlan.operation,
  auth: internalSessionAuth,
  rateLimit: copilotRateLimit,
  errorPolicy: copilotErrorPolicy,
  mapInput: ({ body }) => ({
    workspaceId: body.workspaceId,
    description: body.description,
    currentPlan: body.currentPlan,
  }),
  useCase: generateCopilotPlan,
})
