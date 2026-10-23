import { createCopilotWorkflowContract } from '@/lib/api/contracts/nexora-copilot'
import { defineInternalJsonRoute, internalSessionAuth } from '@/lib/api/server/routes'
import { createWorkflowFromPlan } from '@/lib/nexora/copilot'
import { copilotErrorPolicy, copilotRateLimit } from '@/app/api/nexora/copilot/surface'

/** Creates the workflow a reviewed plan describes, in the chosen folder. */
export const POST = defineInternalJsonRoute({
  contract: createCopilotWorkflowContract,
  operation: createWorkflowFromPlan.operation,
  auth: internalSessionAuth,
  rateLimit: copilotRateLimit,
  errorPolicy: copilotErrorPolicy,
  mapInput: ({ body }) => ({
    workspaceId: body.workspaceId,
    plan: body.plan,
    folderId: body.folderId,
  }),
  useCase: createWorkflowFromPlan,
  present: ({ workflow, warnings }) => ({ workflowId: workflow.id, warnings }),
})
