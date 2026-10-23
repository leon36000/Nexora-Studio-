import { defineWorkspaceOperation } from '@/lib/core/application/workspace-operation'

/**
 * Any member of a workspace may use the Assistant, through the signed-in app only. A conversation
 * belongs to its author: the conversation-scoped use cases conceal another member's conversation
 * as not found before authorizing the workspace.
 */
const ASSISTANT_POLICY = {
  minimumRole: 'read',
  workspaceApiKey: 'deny',
  principalKinds: ['session'],
} as const

/**
 * The Assistant's semantic operations. No permission group governs them: they only store the
 * member's own conversations, while talking to an agent goes through that agent's deployed chat,
 * which applies its own access rules.
 */
export const assistantOperations = {
  // permission-group-exempt: lists the published agents a member may already reach through their deployed chats.
  listAgents: defineWorkspaceOperation({
    id: 'nexora.assistant.agents.list',
    ...ASSISTANT_POLICY,
    capability: 'none',
  }),
  /**
   * Provides the workspace's « Assistant général » (created, deployed and published for members
   * on first use). Any member may trigger it: the agent is a fixed, Nexora-provided one, its chat
   * is reserved to the workspace's members, and the creation is attributed to that member.
   */
  // permission-group-exempt: provides one fixed members-only agent; no member-chosen content is created.
  ensureGeneralAgent: defineWorkspaceOperation({
    id: 'nexora.assistant.agents.ensureGeneral',
    ...ASSISTANT_POLICY,
    capability: 'none',
  }),
  // permission-group-exempt: a member's own private conversations, under workspace membership only.
  listConversations: defineWorkspaceOperation({
    id: 'nexora.assistant.conversations.list',
    ...ASSISTANT_POLICY,
    capability: 'none',
  }),
  // permission-group-exempt: a member's own private conversations, under workspace membership only.
  createConversation: defineWorkspaceOperation({
    id: 'nexora.assistant.conversations.create',
    ...ASSISTANT_POLICY,
    capability: 'none',
  }),
  // permission-group-exempt: a member's own private conversations, under workspace membership only.
  readConversation: defineWorkspaceOperation({
    id: 'nexora.assistant.conversations.read',
    ...ASSISTANT_POLICY,
    capability: 'none',
  }),
  // permission-group-exempt: a member's own private conversations, under workspace membership only.
  renameConversation: defineWorkspaceOperation({
    id: 'nexora.assistant.conversations.rename',
    ...ASSISTANT_POLICY,
    capability: 'none',
  }),
  // permission-group-exempt: a member's own private conversations, under workspace membership only.
  deleteConversation: defineWorkspaceOperation({
    id: 'nexora.assistant.conversations.delete',
    ...ASSISTANT_POLICY,
    capability: 'none',
  }),
  // permission-group-exempt: a member's own private conversations, under workspace membership only.
  appendMessage: defineWorkspaceOperation({
    id: 'nexora.assistant.messages.append',
    ...ASSISTANT_POLICY,
    capability: 'none',
  }),
} as const
