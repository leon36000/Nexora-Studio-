import { defineWorkspaceOperation } from '@/lib/core/application/workspace-operation'

const policy = {
  principalKinds: ['session'],
  workspaceApiKey: 'deny',
} as const

/**
 * Nexora edition: the « Traitements par lot » screen. A batch belongs to the workspace: every
 * member reads it; editing the workspace is what it takes to start one (it spends tokens and adds
 * a column to a table), cancel it or delete it. The batches made through the developer API are
 * listed and can be cancelled here too. The public API and workspace keys have no access to these
 * operations: they have `/v1/batches`.
 *
 * Every operation is exempt from access groups: they have no batches switch yet (governance K14).
 */
export const nexoraBatchOperations = Object.freeze({
  // permission-group-exempt: access groups have no batches switch; reading follows workspace access.
  listBatches: defineWorkspaceOperation({
    ...policy,
    id: 'nexora_batches.list',
    minimumRole: 'read',
    capability: 'none',
  }),
  // permission-group-exempt: access groups have no batches switch; reading follows workspace access.
  readBatch: defineWorkspaceOperation({
    ...policy,
    id: 'nexora_batches.read',
    minimumRole: 'read',
    capability: 'none',
  }),
  // permission-group-exempt: access groups have no batches switch; reading follows workspace access.
  exportBatch: defineWorkspaceOperation({
    ...policy,
    id: 'nexora_batches.export',
    minimumRole: 'read',
    capability: 'none',
  }),
  // permission-group-exempt: access groups have no batches switch; writing follows workspace edit rights.
  listSources: defineWorkspaceOperation({
    ...policy,
    id: 'nexora_batches.sources',
    minimumRole: 'write',
    capability: 'none',
  }),
  // permission-group-exempt: access groups have no batches switch; writing follows workspace edit rights.
  launchBatch: defineWorkspaceOperation({
    ...policy,
    id: 'nexora_batches.launch',
    minimumRole: 'write',
    capability: 'none',
  }),
  // permission-group-exempt: access groups have no batches switch; writing follows workspace edit rights.
  cancelBatch: defineWorkspaceOperation({
    ...policy,
    id: 'nexora_batches.cancel',
    minimumRole: 'write',
    capability: 'none',
  }),
  // permission-group-exempt: access groups have no batches switch; writing follows workspace edit rights.
  deleteBatch: defineWorkspaceOperation({
    ...policy,
    id: 'nexora_batches.delete',
    minimumRole: 'write',
    capability: 'none',
  }),
})
