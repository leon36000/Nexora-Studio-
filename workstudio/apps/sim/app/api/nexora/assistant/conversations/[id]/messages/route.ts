import { appendAssistantMessageContract } from '@/lib/api/contracts/nexora-assistant'
import {
  defineInternalJsonRoute,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { appendAssistantMessage } from '@/lib/nexora/assistant'
import { assistantErrorPolicy, presentMessage } from '@/app/api/nexora/assistant/surface'

/**
 * Records a question or an answer of the conversation. The page sends the question to the agent's
 * deployed chat itself and records both once the answer stream ends (a cut answer is marked
 * interrupted).
 */
export const POST = defineInternalJsonRoute({
  contract: appendAssistantMessageContract,
  operation: appendAssistantMessage.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.assistant.write' }),
  errorPolicy: assistantErrorPolicy,
  mapInput: ({ params, body }) => ({
    conversationId: params.id,
    role: body.role,
    content: body.content,
    usage: body.usage,
    interrupted: body.interrupted,
    files: body.files,
  }),
  useCase: appendAssistantMessage,
  present: ({ message }) => ({ message: presentMessage(message) }),
})
