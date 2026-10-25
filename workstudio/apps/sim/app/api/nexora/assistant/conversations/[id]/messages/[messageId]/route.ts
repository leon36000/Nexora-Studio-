import { updateAssistantMessageContract } from '@/lib/api/contracts/nexora-assistant'
import {
  defineInternalJsonRoute,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { updateAssistantMessage } from '@/lib/nexora/assistant'
import { assistantErrorPolicy, presentMessage } from '@/app/api/nexora/assistant/surface'

/** Replaces the card of one of the caller’s messages, such as a run once its validation is answered. */
export const PATCH = defineInternalJsonRoute({
  contract: updateAssistantMessageContract,
  operation: updateAssistantMessage.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.assistant.write' }),
  errorPolicy: assistantErrorPolicy,
  mapInput: ({ params, body }) => ({
    conversationId: params.id,
    messageId: params.messageId,
    card: body.card,
  }),
  useCase: updateAssistantMessage,
  present: ({ message }) => ({ message: presentMessage(message) }),
})
