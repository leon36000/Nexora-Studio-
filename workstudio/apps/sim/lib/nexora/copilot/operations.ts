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
  /**
   * Drafts a plan with the Nexora model from the workspace's service and knowledge base names;
   * stores nothing, but is the first step of authoring, so a member who may not edit workflows is
   * refused here rather than after spending a model call on a plan they cannot create.
   */
  generatePlan: defineWorkspaceOperation({
    id: 'nexora.copilot.plan.generate',
    ...COPILOT_POLICY,
    capability: 'workflows.edit',
  }),
  /**
   * Compiles a reviewed plan and imports it as a new workflow. The importer still judges the
   * blocks against the member's allowed integrations.
   */
  createWorkflow: defineWorkspaceOperation({
    id: 'nexora.copilot.workflows.create',
    ...COPILOT_POLICY,
    capability: 'workflows.edit',
  }),
} as const
