import { defineWorkspaceOperation } from '@/lib/core/application/workspace-operation'

const promptPolicy = {
  principalKinds: ['session', 'personal_api_key', 'oauth_access_token', 'workspace_api_key'],
  workspaceApiKey: 'allow',
} as const

/**
 * Nexora edition: versioned prompts. A prompt is shared with the whole workspace: every member
 * reads it, editing the workspace is what it takes to change one. A workspace key acts within its
 * write ceiling (a CI job publishing a new version), never as a member.
 *
 * Every operation is exempt from access groups: they have no prompts switch yet (governance K14),
 * and agents a group may run read prompts at run time whatever the group.
 */
export const nexoraPromptOperations = Object.freeze({
  // permission-group-exempt: access groups have no prompts switch; reading follows workspace access.
  list: defineWorkspaceOperation({
    ...promptPolicy,
    id: 'nexora_prompts.list',
    oauthScope: 'api:read',
    minimumRole: 'read',
    capability: 'none',
  }),
  // permission-group-exempt: access groups have no prompts switch; reading follows workspace access.
  read: defineWorkspaceOperation({
    ...promptPolicy,
    id: 'nexora_prompts.read',
    oauthScope: 'api:read',
    minimumRole: 'read',
    capability: 'none',
  }),
  // permission-group-exempt: access groups have no prompts switch; writing follows workspace edit rights.
  create: defineWorkspaceOperation({
    ...promptPolicy,
    id: 'nexora_prompts.create',
    oauthScope: 'api:write',
    minimumRole: 'write',
    capability: 'none',
  }),
  // permission-group-exempt: access groups have no prompts switch; writing follows workspace edit rights.
  createVersion: defineWorkspaceOperation({
    ...promptPolicy,
    id: 'nexora_prompts.versions.create',
    oauthScope: 'api:write',
    minimumRole: 'write',
    capability: 'none',
  }),
  // permission-group-exempt: access groups have no prompts switch; writing follows workspace edit rights.
  moveLabel: defineWorkspaceOperation({
    ...promptPolicy,
    id: 'nexora_prompts.labels.move',
    oauthScope: 'api:write',
    minimumRole: 'write',
    capability: 'none',
  }),
  // permission-group-exempt: access groups have no prompts switch; writing follows workspace edit rights.
  delete: defineWorkspaceOperation({
    ...promptPolicy,
    id: 'nexora_prompts.delete',
    oauthScope: 'api:write',
    minimumRole: 'write',
    capability: 'none',
  }),
})
