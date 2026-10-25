import { defineWorkspaceOperation } from '@/lib/core/application/workspace-operation'

const policy = {
  principalKinds: ['session'],
  workspaceApiKey: 'deny',
} as const

/**
 * Nexora edition: evaluations (test sets, judges, campaigns, schedules, alerts). Everything in
 * them belongs to the workspace: every member reads, editing the workspace is what it takes to
 * import a test set, launch a campaign (it spends tokens) or change a judge or a schedule. The
 * public API and workspace keys have no access: a campaign is run from the Evaluations page.
 *
 * Every operation is exempt from access groups: they have no evaluations switch yet (governance K14).
 */
export const nexoraEvaluationOperations = Object.freeze({
  // permission-group-exempt: access groups have no evaluations switch; reading follows workspace access.
  listDatasets: defineWorkspaceOperation({
    ...policy,
    id: 'nexora_evaluations.datasets.list',
    minimumRole: 'read',
    capability: 'none',
  }),
  // permission-group-exempt: access groups have no evaluations switch; reading follows workspace access.
  readDataset: defineWorkspaceOperation({
    ...policy,
    id: 'nexora_evaluations.datasets.read',
    minimumRole: 'read',
    capability: 'none',
  }),
  // permission-group-exempt: access groups have no evaluations switch; reading follows workspace access.
  listJudges: defineWorkspaceOperation({
    ...policy,
    id: 'nexora_evaluations.judges.list',
    minimumRole: 'read',
    capability: 'none',
  }),
  // permission-group-exempt: access groups have no evaluations switch; reading follows workspace access.
  listCampaigns: defineWorkspaceOperation({
    ...policy,
    id: 'nexora_evaluations.campaigns.list',
    minimumRole: 'read',
    capability: 'none',
  }),
  // permission-group-exempt: access groups have no evaluations switch; reading follows workspace access.
  readCampaign: defineWorkspaceOperation({
    ...policy,
    id: 'nexora_evaluations.campaigns.read',
    minimumRole: 'read',
    capability: 'none',
  }),
  // permission-group-exempt: access groups have no evaluations switch; reading follows workspace access.
  compareCampaigns: defineWorkspaceOperation({
    ...policy,
    id: 'nexora_evaluations.campaigns.compare',
    minimumRole: 'read',
    capability: 'none',
  }),
  // permission-group-exempt: access groups have no evaluations switch; reading follows workspace access.
  listSchedules: defineWorkspaceOperation({
    ...policy,
    id: 'nexora_evaluations.schedules.list',
    minimumRole: 'read',
    capability: 'none',
  }),
  // permission-group-exempt: access groups have no evaluations switch; reading follows workspace access.
  listAlerts: defineWorkspaceOperation({
    ...policy,
    id: 'nexora_evaluations.alerts.list',
    minimumRole: 'read',
    capability: 'none',
  }),
  // permission-group-exempt: access groups have no evaluations switch; writing follows workspace edit rights.
  listImportSources: defineWorkspaceOperation({
    ...policy,
    id: 'nexora_evaluations.datasets.sources',
    minimumRole: 'write',
    capability: 'none',
  }),
  // permission-group-exempt: access groups have no evaluations switch; writing follows workspace edit rights.
  createDataset: defineWorkspaceOperation({
    ...policy,
    id: 'nexora_evaluations.datasets.create',
    minimumRole: 'write',
    capability: 'none',
  }),
  // permission-group-exempt: access groups have no evaluations switch; writing follows workspace edit rights.
  updateDataset: defineWorkspaceOperation({
    ...policy,
    id: 'nexora_evaluations.datasets.update',
    minimumRole: 'write',
    capability: 'none',
  }),
  // permission-group-exempt: access groups have no evaluations switch; writing follows workspace edit rights.
  deleteDataset: defineWorkspaceOperation({
    ...policy,
    id: 'nexora_evaluations.datasets.delete',
    minimumRole: 'write',
    capability: 'none',
  }),
  // permission-group-exempt: access groups have no evaluations switch; writing follows workspace edit rights.
  saveJudge: defineWorkspaceOperation({
    ...policy,
    id: 'nexora_evaluations.judges.save',
    minimumRole: 'write',
    capability: 'none',
  }),
  // permission-group-exempt: access groups have no evaluations switch; writing follows workspace edit rights.
  deleteJudge: defineWorkspaceOperation({
    ...policy,
    id: 'nexora_evaluations.judges.delete',
    minimumRole: 'write',
    capability: 'none',
  }),
  // permission-group-exempt: access groups have no evaluations switch; writing follows workspace edit rights.
  tryJudge: defineWorkspaceOperation({
    ...policy,
    id: 'nexora_evaluations.judges.try',
    minimumRole: 'write',
    capability: 'none',
  }),
  // permission-group-exempt: access groups have no evaluations switch; writing follows workspace edit rights.
  launchCampaign: defineWorkspaceOperation({
    ...policy,
    id: 'nexora_evaluations.campaigns.launch',
    minimumRole: 'write',
    capability: 'none',
  }),
  // permission-group-exempt: access groups have no evaluations switch; writing follows workspace edit rights.
  cancelCampaign: defineWorkspaceOperation({
    ...policy,
    id: 'nexora_evaluations.campaigns.cancel',
    minimumRole: 'write',
    capability: 'none',
  }),
  // permission-group-exempt: access groups have no evaluations switch; writing follows workspace edit rights.
  deleteCampaign: defineWorkspaceOperation({
    ...policy,
    id: 'nexora_evaluations.campaigns.delete',
    minimumRole: 'write',
    capability: 'none',
  }),
  // permission-group-exempt: access groups have no evaluations switch; writing follows workspace edit rights.
  saveSchedule: defineWorkspaceOperation({
    ...policy,
    id: 'nexora_evaluations.schedules.save',
    minimumRole: 'write',
    capability: 'none',
  }),
  // permission-group-exempt: access groups have no evaluations switch; writing follows workspace edit rights.
  deleteSchedule: defineWorkspaceOperation({
    ...policy,
    id: 'nexora_evaluations.schedules.delete',
    minimumRole: 'write',
    capability: 'none',
  }),
  // permission-group-exempt: access groups have no evaluations switch; writing follows workspace edit rights.
  runSchedule: defineWorkspaceOperation({
    ...policy,
    id: 'nexora_evaluations.schedules.run',
    minimumRole: 'write',
    capability: 'none',
  }),
  // permission-group-exempt: access groups have no evaluations switch; writing follows workspace edit rights.
  acknowledgeAlert: defineWorkspaceOperation({
    ...policy,
    id: 'nexora_evaluations.alerts.acknowledge',
    minimumRole: 'write',
    capability: 'none',
  }),
})
