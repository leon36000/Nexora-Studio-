import { defineWorkspaceOperation } from '@/lib/core/application/workspace-operation'

/**
 * Authoring workflows with the Copilot: members with write access, through the signed-in app
 * only (the model call is metered by Nexora API on WorkStudio's own key).
 */
const COPILOT_POLICY = {
  minimumRole: 'write',
  workspaceApiKey: 'deny',
  principalKinds: ['session'],
} as const

/** The Copilot's semantic operations. */
export const copilotOperations = {
  /** Drafts a plan with the Nexora model from the workspace's service and knowledge base names; stores nothing. */
  // permission-group-exempt: workflow authoring is governed by workspace role, like workflows.create; the plan only names services and bases a writer already sees.
  generatePlan: defineWorkspaceOperation({
    id: 'nexora.copilot.plan.generate',
    ...COPILOT_POLICY,
    capability: 'none',
  }),
  /** Compiles a reviewed plan and imports it as a new workflow. */
  // permission-group-exempt: importing is workflow authoring governed by workspace role, like workflows.import; the importer judges the blocks against the member's allowed integrations.
  createWorkflow: defineWorkspaceOperation({
    id: 'nexora.copilot.workflows.create',
    ...COPILOT_POLICY,
    capability: 'none',
  }),
} as const
