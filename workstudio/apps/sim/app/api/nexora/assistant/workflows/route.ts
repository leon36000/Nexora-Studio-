import { listAssistantWorkflowsContract } from '@/lib/api/contracts/nexora-assistant-extras'
import {
  defineInternalJsonRoute,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { listAssistantWorkflows } from '@/lib/nexora/assistant/workflows'
import { assistantErrorPolicy } from '@/app/api/nexora/assistant/surface'

/** The workflows published for the Assistant, each with the form its Start block describes. */
export const GET = defineInternalJsonRoute({
  contract: listAssistantWorkflowsContract,
  operation: listAssistantWorkflows.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.none({
    reason: 'Session-only read of the workspace’s published workflows',
  }),
  errorPolicy: assistantErrorPolicy,
  mapInput: ({ query }) => ({ workspaceId: query.workspaceId }),
  useCase: listAssistantWorkflows,
  present: ({ workflows }) => ({ workflows }),
})
