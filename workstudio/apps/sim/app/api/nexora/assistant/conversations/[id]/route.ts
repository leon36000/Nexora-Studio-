import {
  deleteAssistantConversationContract,
  getAssistantConversationContract,
  renameAssistantConversationContract,
} from '@/lib/api/contracts/nexora-assistant'
import {
  defineInternalJsonRoute,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import {
  deleteAssistantConversation,
  getAssistantConversation,
  renameAssistantConversation,
} from '@/lib/nexora/assistant'
import {
  assistantErrorPolicy,
  presentConversation,
  presentMessage,
} from '@/app/api/nexora/assistant/surface'

const OWN_CONVERSATION_RATE_LIMIT = internalRateLimits.none({
  reason: 'Session-only access to one of the caller’s own conversations',
})

/** One of the caller's conversations with its messages and, while published, its agent. */
export const GET = defineInternalJsonRoute({
  contract: getAssistantConversationContract,
  operation: getAssistantConversation.operation,
  auth: internalSessionAuth,
  rateLimit: OWN_CONVERSATION_RATE_LIMIT,
  errorPolicy: assistantErrorPolicy,
  mapInput: ({ params }) => ({ conversationId: params.id }),
  useCase: getAssistantConversation,
  present: ({ conversation, messages, agent }) => ({
    conversation: presentConversation(conversation),
    messages: messages.map(presentMessage),
    agent,
  }),
})

export const PATCH = defineInternalJsonRoute({
  contract: renameAssistantConversationContract,
  operation: renameAssistantConversation.operation,
  auth: internalSessionAuth,
  rateLimit: OWN_CONVERSATION_RATE_LIMIT,
  errorPolicy: assistantErrorPolicy,
  mapInput: ({ params, body }) => ({ conversationId: params.id, title: body.title }),
  useCase: renameAssistantConversation,
  present: ({ conversation }) => ({ conversation: presentConversation(conversation) }),
})

/** Deletes the conversation and its messages. */
export const DELETE = defineInternalJsonRoute({
  contract: deleteAssistantConversationContract,
  operation: deleteAssistantConversation.operation,
  auth: internalSessionAuth,
  rateLimit: OWN_CONVERSATION_RATE_LIMIT,
  errorPolicy: assistantErrorPolicy,
  mapInput: ({ params }) => ({ conversationId: params.id }),
  useCase: deleteAssistantConversation,
  present: () => ({ success: true as const }),
})
