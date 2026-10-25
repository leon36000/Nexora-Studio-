import { defineOrganizationOperation } from '@/lib/core/application/organization-operation'
import { defineWorkspaceOperation } from '@/lib/core/application/workspace-operation'

const workspacePolicy = {
  principalKinds: ['session'],
  workspaceApiKey: 'deny',
} as const

const instancePolicy = {
  minimumRole: 'admin',
  principalKinds: ['session'],
} as const

/**
 * Nexora edition: traces of model calls. Every member of a workspace reads its shared traces;
 * private ones (the Assistant's members-only chats, the Playground, the Copilot) are filtered in
 * the use case to their author and the workspace's administrators. Settings, purges and the
 * traces of no workspace belong to the instance administrators.
 */
export const nexoraTraceOperations = Object.freeze({
  // permission-group-exempt: reading what the member's own work recorded is not a governed capability.
  listWorkspace: defineWorkspaceOperation({
    ...workspacePolicy,
    id: 'nexora_traces.workspace.list',
    minimumRole: 'read',
    capability: 'none',
  }),
  // permission-group-exempt: reading what the member's own work recorded is not a governed capability.
  readWorkspace: defineWorkspaceOperation({
    ...workspacePolicy,
    id: 'nexora_traces.workspace.read',
    minimumRole: 'read',
    capability: 'none',
  }),
  // permission-group-exempt: filter values come from the traces the member may already list.
  facetsWorkspace: defineWorkspaceOperation({
    ...workspacePolicy,
    id: 'nexora_traces.workspace.facets',
    minimumRole: 'read',
    capability: 'none',
  }),
  // permission-group-exempt: instance administrators govern the traces of no workspace.
  listInstance: defineOrganizationOperation({
    ...instancePolicy,
    id: 'organization.nexora_traces.list',
    capability: 'none',
  }),
  // permission-group-exempt: instance administrators govern the traces of no workspace.
  readInstance: defineOrganizationOperation({
    ...instancePolicy,
    id: 'organization.nexora_traces.read',
    capability: 'none',
  }),
  // permission-group-exempt: instance administrators govern the trace settings.
  readSettings: defineOrganizationOperation({
    ...instancePolicy,
    id: 'organization.nexora_traces.settings.read',
    capability: 'none',
  }),
  // permission-group-exempt: instance administrators govern the trace settings.
  updateSettings: defineOrganizationOperation({
    ...instancePolicy,
    id: 'organization.nexora_traces.settings.update',
    capability: 'none',
  }),
  // permission-group-exempt: instance administrators govern the trace settings.
  testExport: defineOrganizationOperation({
    ...instancePolicy,
    id: 'organization.nexora_traces.settings.test_export',
    capability: 'none',
  }),
  // permission-group-exempt: instance administrators govern retention.
  purge: defineOrganizationOperation({
    ...instancePolicy,
    id: 'organization.nexora_traces.purge',
    capability: 'none',
  }),
})
