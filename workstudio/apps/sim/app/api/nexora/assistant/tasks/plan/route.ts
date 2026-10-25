import { planAssistantTaskContract } from '@/lib/api/contracts/nexora-assistant-extras'
import {
  defineInternalJsonRoute,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { planAssistantTask } from '@/lib/nexora/assistant/tasks'
import { assistantErrorPolicy } from '@/app/api/nexora/assistant/surface'

/** Each plan is up to two model calls: a few per minute per member is plenty for a person. */
export const POST = defineInternalJsonRoute({
  contract: planAssistantTaskContract,
  operation: planAssistantTask.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({
    bucketName: 'nexora.assistant.tasks',
    config: { maxTokens: 10, refillRate: 10, refillIntervalMs: 60_000 },
  }),
  errorPolicy: assistantErrorPolicy,
  mapInput: ({ body }) => ({ workspaceId: body.workspaceId, request: body.request }),
  useCase: planAssistantTask,
  present: ({ plan, summary, warnings, schedule }) => ({ plan, summary, warnings, schedule }),
})
