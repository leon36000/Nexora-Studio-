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
  updateMessage: defineWorkspaceOperation({
    id: 'nexora.assistant.messages.update',
    ...ASSISTANT_POLICY,
    capability: 'none',
  }),
  // permission-group-exempt: a member's own private conversations, under workspace membership only.
  appendMessage: defineWorkspaceOperation({
    id: 'nexora.assistant.messages.append',
    ...ASSISTANT_POLICY,
    capability: 'none',
  }),
  /**
   * Plans, then creates, a member's scheduled task: the Copilot writes a workflow and it is
   * deployed, so it needs the same write access (and capability) as creating a workflow.
   */
  planTask: defineWorkspaceOperation({
    id: 'nexora.assistant.tasks.plan',
    ...ASSISTANT_POLICY,
    minimumRole: 'write',
    capability: 'workflows.edit',
  }),
  createTask: defineWorkspaceOperation({
    id: 'nexora.assistant.tasks.create',
    ...ASSISTANT_POLICY,
    minimumRole: 'write',
    capability: 'workflows.edit',
  }),
  // permission-group-exempt: a member's own scheduled tasks, under workspace membership only.
  listTasks: defineWorkspaceOperation({
    id: 'nexora.assistant.tasks.list',
    ...ASSISTANT_POLICY,
    capability: 'none',
  }),
  // permission-group-exempt: a member's own scheduled tasks, under workspace membership only.
  setTaskEnabled: defineWorkspaceOperation({
    id: 'nexora.assistant.tasks.setEnabled',
    ...ASSISTANT_POLICY,
    capability: 'none',
  }),
  // permission-group-exempt: a member's own scheduled tasks, under workspace membership only.
  deleteTask: defineWorkspaceOperation({
    id: 'nexora.assistant.tasks.delete',
    ...ASSISTANT_POLICY,
    capability: 'none',
  }),
  // permission-group-exempt: a member's own scheduled tasks, under workspace membership only.
  listTaskRuns: defineWorkspaceOperation({
    id: 'nexora.assistant.tasks.runs',
    ...ASSISTANT_POLICY,
    capability: 'none',
  }),
  // permission-group-exempt: lists the workflows a writer made available, which members may already run.
  listWorkflows: defineWorkspaceOperation({
    id: 'nexora.assistant.workflows.list',
    ...ASSISTANT_POLICY,
    capability: 'none',
  }),
  // permission-group-exempt: only lists names a writer already sees in the editor.
  listPublishableWorkflows: defineWorkspaceOperation({
    id: 'nexora.assistant.workflows.listPublishable',
    ...ASSISTANT_POLICY,
    minimumRole: 'write',
    capability: 'none',
  }),
  /** Publishing deploys the workflow when it is not, hence the deployment capability. */
  publishWorkflow: defineWorkspaceOperation({
    id: 'nexora.assistant.workflows.publish',
    ...ASSISTANT_POLICY,
    minimumRole: 'write',
    capability: 'deploy.api',
  }),
  // permission-group-exempt: withdraws a workflow from the Assistant; nothing is deployed or removed.
  unpublishWorkflow: defineWorkspaceOperation({
    id: 'nexora.assistant.workflows.unpublish',
    ...ASSISTANT_POLICY,
    minimumRole: 'write',
    capability: 'none',
  }),
  // permission-group-exempt: lists the workspace's skills' names, which every member may already read.
  listSkills: defineWorkspaceOperation({
    id: 'nexora.assistant.skills.list',
    ...ASSISTANT_POLICY,
    capability: 'none',
  }),
  // permission-group-exempt: a member's own private projects, under workspace membership only.
  listProjects: defineWorkspaceOperation({
    id: 'nexora.assistant.projects.list',
    ...ASSISTANT_POLICY,
    capability: 'none',
  }),
  // permission-group-exempt: a member's own private projects, under workspace membership only.
  createProject: defineWorkspaceOperation({
    id: 'nexora.assistant.projects.create',
    ...ASSISTANT_POLICY,
    capability: 'none',
  }),
  // permission-group-exempt: a member's own private projects, under workspace membership only.
  readProject: defineWorkspaceOperation({
    id: 'nexora.assistant.projects.read',
    ...ASSISTANT_POLICY,
    capability: 'none',
  }),
  // permission-group-exempt: a member's own private projects, under workspace membership only.
  updateProject: defineWorkspaceOperation({
    id: 'nexora.assistant.projects.update',
    ...ASSISTANT_POLICY,
    capability: 'none',
  }),
  // permission-group-exempt: a member's own private projects, under workspace membership only.
  deleteProject: defineWorkspaceOperation({
    id: 'nexora.assistant.projects.delete',
    ...ASSISTANT_POLICY,
    capability: 'none',
  }),
  // permission-group-exempt: a member's own private projects, under workspace membership only.
  addProjectFile: defineWorkspaceOperation({
    id: 'nexora.assistant.projects.files.add',
    ...ASSISTANT_POLICY,
    capability: 'none',
  }),
  // permission-group-exempt: a member's own private projects, under workspace membership only.
  deleteProjectFile: defineWorkspaceOperation({
    id: 'nexora.assistant.projects.files.delete',
    ...ASSISTANT_POLICY,
    capability: 'none',
  }),
} as const
