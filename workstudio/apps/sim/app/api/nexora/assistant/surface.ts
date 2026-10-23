import {
  extendInternalErrorPolicy,
  internalErrorResponse,
  internalOrchestrationErrorPolicy,
} from '@/lib/api/server/routes'
import {
  AssistantAgentUnpublishedError,
  type AssistantConversationRecord,
  type AssistantMessageRecord,
} from '@/lib/nexora/assistant'

/**
 * The Assistant routes' errors: an unpublished agent is a 409 carrying the code the page branches
 * on; everything else follows the orchestration classes (another member's conversation is a 404,
 * a workspace without access a 403).
 */
export const assistantErrorPolicy = extendInternalErrorPolicy(
  internalOrchestrationErrorPolicy,
  (error) =>
    error instanceof AssistantAgentUnpublishedError
      ? internalErrorResponse(409, { error: error.message, code: error.reason })
      : null
)

export function presentConversation(conversation: AssistantConversationRecord) {
  return {
    id: conversation.id,
    workspaceId: conversation.workspaceId,
    workflowId: conversation.workflowId,
    title: conversation.title,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  }
}

export function presentMessage(message: AssistantMessageRecord) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
    files: (message.files ?? []).map(({ name, type, size }) => ({ name, type, size })),
    usage: message.usage,
    interrupted: message.interrupted,
    createdAt: message.createdAt.toISOString(),
  }
}
