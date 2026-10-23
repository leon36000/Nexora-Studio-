import { defineOrganizationOperation } from '@/lib/core/application/organization-operation'
import { defineWorkspaceOperation } from '@/lib/core/application/workspace-operation'

const workspacePolicy = {
  principalKinds: ['session'],
  workspaceApiKey: 'deny',
} as const

/**
 * Nexora edition: keys of the OpenAI-compatible developer API. A workspace key calls the
 * workspace's models and published agents, so creating one takes the right to edit the workspace
 * (a key never outranks its creator); every member can see them. Revoking is never withheld by an
 * access group: a leaked key must always be revocable.
 */
export const nexoraApiKeyOperations = Object.freeze({
  listWorkspace: defineWorkspaceOperation({
    ...workspacePolicy,
    id: 'nexora_api_keys.workspace.list',
    minimumRole: 'read',
    capability: 'api_keys.manage',
  }),
  createWorkspace: defineWorkspaceOperation({
    ...workspacePolicy,
    id: 'nexora_api_keys.workspace.create',
    minimumRole: 'write',
    capability: 'api_keys.manage',
  }),
  // permission-group-exempt: a leaked key must stay revocable by anyone who may edit the workspace.
  revokeWorkspace: defineWorkspaceOperation({
    ...workspacePolicy,
    id: 'nexora_api_keys.workspace.revoke',
    minimumRole: 'write',
    capability: 'none',
  }),
  // permission-group-exempt: instance administrators govern instance-wide keys.
  listInstance: defineOrganizationOperation({
    id: 'organization.nexora_api_keys.list',
    minimumRole: 'admin',
    principalKinds: ['session'],
    capability: 'none',
  }),
  // permission-group-exempt: instance administrators govern instance-wide keys.
  createInstance: defineOrganizationOperation({
    id: 'organization.nexora_api_keys.create',
    minimumRole: 'admin',
    principalKinds: ['session'],
    capability: 'none',
  }),
  // permission-group-exempt: instance administrators govern instance-wide keys.
  revokeInstance: defineOrganizationOperation({
    id: 'organization.nexora_api_keys.revoke',
    minimumRole: 'admin',
    principalKinds: ['session'],
    capability: 'none',
  }),
})
