import {
  createAssistantConversationContract,
  listAssistantConversationsContract,
} from '@/lib/api/contracts/nexora-assistant'
import {
  defineInternalJsonRoute,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { createAssistantConversation, listAssistantConversations } from '@/lib/nexora/assistant'
import { assistantErrorPolicy, presentConversation } from '@/app/api/nexora/assistant/surface'

/** The caller's own Assistant conversations in a workspace. */
export const GET = defineInternalJsonRoute({
  contract: listAssistantConversationsContract,
  operation: listAssistantConversations.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.none({
    reason: 'Session-only read of the caller’s own conversations, at most 50 rows',
  }),
  errorPolicy: assistantErrorPolicy,
  mapInput: ({ query }) => ({ workspaceId: query.workspaceId }),
  useCase: listAssistantConversations,
  present: ({ conversations }) => ({ conversations: conversations.map(presentConversation) }),
})

/** Opens a conversation with a published agent of the workspace. */
export const POST = defineInternalJsonRoute({
  contract: createAssistantConversationContract,
  operation: createAssistantConversation.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.assistant.write' }),
  errorPolicy: assistantErrorPolicy,
  mapInput: ({ body }) => ({
    workspaceId: body.workspaceId,
    workflowId: body.workflowId,
    firstMessage: body.firstMessage,
    projectId: body.projectId,
  }),
  useCase: createAssistantConversation,
  present: ({ conversation }) => ({ conversation: presentConversation(conversation) }),
})
