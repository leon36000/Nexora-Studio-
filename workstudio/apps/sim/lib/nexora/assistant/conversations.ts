import type { SessionPrincipal } from '@sim/auth/principal'
import { truncateAtCodePoint } from '@sim/utils/string'
import { ASSISTANT_AGENT_UNPUBLISHED_CODE } from '@/lib/api/contracts/nexora-assistant'
import { defineAuthorizedWorkspaceUseCase } from '@/lib/core/application/authorized-workspace-use-case'
import { OrchestrationError } from '@/lib/core/orchestration/types'
import { type AssistantAgent, findPublishedAgent } from '@/lib/nexora/assistant/agents'
import { assistantOperations } from '@/lib/nexora/assistant/operations'
import { loadProject } from '@/lib/nexora/assistant/projects/repository'
import {
  type AssistantConversationRecord,
  type AssistantMessageRecord,
  deleteConversation,
  insertConversation,
  insertMessage,
  listConversations,
  listMessages,
  loadConversation,
  type NewAssistantMessage,
  updateConversationTitle,
} from '@/lib/nexora/assistant/repository'
import {
  type ActiveWorkspaceApplicationContext,
  resolveActiveWorkspaceApplicationContext,
} from '@/lib/workspaces/application/context'

const TITLE_MAX_LENGTH = 60
const TITLE_CUT_MARK = '…'

/**
 * The conversation's agent is no longer a published agent of its workspace. The conversation
 * stays readable; nothing more can be added to it.
 */
export class AssistantAgentUnpublishedError extends OrchestrationError {
  readonly reason = ASSISTANT_AGENT_UNPUBLISHED_CODE

  constructor() {
    super('conflict', 'This agent is no longer published')
    this.name = 'AssistantAgentUnpublishedError'
  }
}

/**
 * A conversation's title: its first message on one line, at most 60 characters, cut after the
 * last whole word and marked « … » when it was longer.
 */
function deriveConversationTitle(firstMessage: string): string {
  const text = firstMessage.replace(/\s+/g, ' ').trim()
  if (text.length <= TITLE_MAX_LENGTH) return text
  const room = TITLE_MAX_LENGTH - TITLE_CUT_MARK.length
  const lastSpace = text.slice(0, room + 1).lastIndexOf(' ')
  if (lastSpace <= 0) return truncateAtCodePoint(text, room, TITLE_CUT_MARK)
  return `${text.slice(0, lastSpace).trimEnd()}${TITLE_CUT_MARK}`
}

interface WorkspaceInput {
  workspaceId: string
}

interface CreateConversationInput extends WorkspaceInput {
  workflowId: string
  firstMessage: string
  /** One of the caller's own projects of the workspace. */
  projectId?: string
}

interface ConversationInput {
  conversationId: string
}

interface RenameConversationInput extends ConversationInput {
  title: string
}

type AppendMessageInput = ConversationInput & NewAssistantMessage

interface OwnedConversationContext extends ActiveWorkspaceApplicationContext {
  conversation: AssistantConversationRecord
}

/**
 * Another member's conversation is not found, exactly like a missing one, and is answered before
 * the workspace is authorized so nothing about it is revealed.
 */
async function resolveOwnedConversationContext(
  principal: SessionPrincipal,
  conversationId: string
): Promise<OwnedConversationContext> {
  const conversation = await loadConversation(conversationId)
  if (!conversation || conversation.userId !== principal.userId) conversationNotFound()
  return {
    ...(await resolveActiveWorkspaceApplicationContext(conversation.workspaceId)),
    conversation,
  }
}

function conversationNotFound(): never {
  throw new OrchestrationError('not_found', 'Conversation not found')
}

export const listAssistantConversations = defineAuthorizedWorkspaceUseCase({
  operation: assistantOperations.listConversations,
  resolveContext: ({ input }: { input: WorkspaceInput }) =>
    resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions: {},
  execute: async ({ principal, context }) => ({
    conversations: await listConversations(context.workspaceId, principal.userId),
  }),
})

/**
 * Opens a conversation with a published agent of the workspace. The first message only names it:
 * the page appends the question, then the answer, once the agent's chat has answered.
 */
export const createAssistantConversation = defineAuthorizedWorkspaceUseCase({
  operation: assistantOperations.createConversation,
  resolveContext: ({ input }: { input: CreateConversationInput }) =>
    resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions: {},
  async execute({ principal, context, input }) {
    const agent = await findPublishedAgent(context.workspaceId, input.workflowId)
    if (!agent) throw new AssistantAgentUnpublishedError()
    if (input.projectId) {
      const project = await loadProject(input.projectId)
      if (
        !project ||
        project.userId !== principal.userId ||
        project.workspaceId !== context.workspaceId
      ) {
        throw new OrchestrationError('not_found', 'Project not found')
      }
    }
    const conversation = await insertConversation({
      workspaceId: context.workspaceId,
      userId: principal.userId,
      workflowId: agent.workflowId,
      title: deriveConversationTitle(input.firstMessage),
      projectId: input.projectId,
    })
    return { conversation }
  },
})

interface AssistantConversationDetailResult {
  conversation: AssistantConversationRecord
  messages: AssistantMessageRecord[]
  /** `null` when the agent is no longer published. */
  agent: AssistantAgent | null
}

export const getAssistantConversation = defineAuthorizedWorkspaceUseCase({
  operation: assistantOperations.readConversation,
  resolveContext: ({
    principal,
    input,
  }: {
    principal: SessionPrincipal
    input: ConversationInput
  }) => resolveOwnedConversationContext(principal, input.conversationId),
  authorizationOptions: {},
  async execute({ context }): Promise<AssistantConversationDetailResult> {
    const { conversation } = context
    const [messages, agent] = await Promise.all([
      listMessages(conversation.id),
      conversation.workflowId
        ? findPublishedAgent(context.workspaceId, conversation.workflowId)
        : Promise.resolve(null),
    ])
    return { conversation, messages, agent }
  },
})

export const renameAssistantConversation = defineAuthorizedWorkspaceUseCase({
  operation: assistantOperations.renameConversation,
  resolveContext: ({
    principal,
    input,
  }: {
    principal: SessionPrincipal
    input: RenameConversationInput
  }) => resolveOwnedConversationContext(principal, input.conversationId),
  authorizationOptions: {},
  async execute({ context, input }) {
    const conversation = await updateConversationTitle(context.conversation.id, input.title.trim())
    if (!conversation) conversationNotFound()
    return { conversation }
  },
})

export const deleteAssistantConversation = defineAuthorizedWorkspaceUseCase({
  operation: assistantOperations.deleteConversation,
  resolveContext: ({
    principal,
    input,
  }: {
    principal: SessionPrincipal
    input: ConversationInput
  }) => resolveOwnedConversationContext(principal, input.conversationId),
  authorizationOptions: {},
  async execute({ context }) {
    if (!(await deleteConversation(context.conversation))) conversationNotFound()
    return { conversationId: context.conversation.id }
  },
})

/** Records a question or an answer; refused once the conversation's agent is unpublished. */
export const appendAssistantMessage = defineAuthorizedWorkspaceUseCase({
  operation: assistantOperations.appendMessage,
  resolveContext: ({
    principal,
    input,
  }: {
    principal: SessionPrincipal
    input: AppendMessageInput
  }) => resolveOwnedConversationContext(principal, input.conversationId),
  authorizationOptions: {},
  async execute({ context, input }) {
    const { conversation } = context
    // A new question needs a published agent; an answer already produced is kept even if the
    // agent was unpublished while it streamed.
    if (input.role === 'user') {
      const agent = conversation.workflowId
        ? await findPublishedAgent(context.workspaceId, conversation.workflowId)
        : null
      if (!agent) throw new AssistantAgentUnpublishedError()
    }
    const message = await insertMessage(conversation.id, {
      role: input.role,
      content: input.content,
      usage: input.usage,
      interrupted: input.interrupted,
      files: input.files,
    })
    if (!message) conversationNotFound()
    return { message }
  },
})
