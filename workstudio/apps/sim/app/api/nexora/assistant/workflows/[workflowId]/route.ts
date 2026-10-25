import {
  publishAssistantWorkflowContract,
  unpublishAssistantWorkflowContract,
} from '@/lib/api/contracts/nexora-assistant-extras'
import {
  defineInternalJsonRoute,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import {
  publishAssistantWorkflow,
  unpublishAssistantWorkflow,
} from '@/lib/nexora/assistant/workflows'
import { assistantErrorPolicy } from '@/app/api/nexora/assistant/surface'

const PUBLISH_RATE_LIMIT = internalRateLimits.user({ bucketName: 'nexora.assistant.publish' })

/** Publishes the workflow for the Assistant, deploying it first when it is not (writers only). */
export const PUT = defineInternalJsonRoute({
  contract: publishAssistantWorkflowContract,
  operation: publishAssistantWorkflow.operation,
  auth: internalSessionAuth,
  rateLimit: PUBLISH_RATE_LIMIT,
  errorPolicy: assistantErrorPolicy,
  mapInput: ({ params, body }) => ({
    workspaceId: body.workspaceId,
    workflowId: params.workflowId,
  }),
  useCase: publishAssistantWorkflow,
  present: () => ({ success: true as const }),
})

export const DELETE = defineInternalJsonRoute({
  contract: unpublishAssistantWorkflowContract,
  operation: unpublishAssistantWorkflow.operation,
  auth: internalSessionAuth,
  rateLimit: PUBLISH_RATE_LIMIT,
  errorPolicy: assistantErrorPolicy,
  mapInput: ({ params, query }) => ({
    workspaceId: query.workspaceId,
    workflowId: params.workflowId,
  }),
  useCase: unpublishAssistantWorkflow,
  present: () => ({ success: true as const }),
})
