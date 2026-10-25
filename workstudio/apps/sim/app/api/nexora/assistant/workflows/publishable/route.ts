import { listPublishableAssistantWorkflowsContract } from '@/lib/api/contracts/nexora-assistant-extras'
import {
  defineInternalJsonRoute,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { listPublishableAssistantWorkflows } from '@/lib/nexora/assistant/workflows'
import { assistantErrorPolicy } from '@/app/api/nexora/assistant/surface'

/** What a writer may publish for the Assistant (writers only). */
export const GET = defineInternalJsonRoute({
  contract: listPublishableAssistantWorkflowsContract,
  operation: listPublishableAssistantWorkflows.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.none({
    reason: 'Session-only read, for writers, of at most 300 workflow names',
  }),
  errorPolicy: assistantErrorPolicy,
  mapInput: ({ query }) => ({ workspaceId: query.workspaceId }),
  useCase: listPublishableAssistantWorkflows,
  present: ({ workflows }) => ({ workflows }),
})
