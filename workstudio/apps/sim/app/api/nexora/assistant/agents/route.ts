import { listAssistantAgentsContract } from '@/lib/api/contracts/nexora-assistant'
import {
  defineInternalJsonRoute,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { listAssistantAgents } from '@/lib/nexora/assistant'
import { assistantErrorPolicy } from '@/app/api/nexora/assistant/surface'

/**
 * The published agents of a workspace the Assistant can talk to, the « Assistant général » first
 * (provided on first use by the list use case).
 */
export const GET = defineInternalJsonRoute({
  contract: listAssistantAgentsContract,
  operation: listAssistantAgents.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.none({
    reason:
      'Session-only read of the workspace agents a member already sees in the app; the general assistant it provides is created once per workspace, under a lock',
  }),
  errorPolicy: assistantErrorPolicy,
  mapInput: ({ query }) => ({ workspaceId: query.workspaceId }),
  useCase: listAssistantAgents,
})
