import { AuditAction, AuditResourceType } from '@sim/audit'
import { requirePrincipalSubjectUserId } from '@sim/auth/principal'
import { capabilityGovernedPrincipalUserId } from '@/lib/core/application'
import { defineAuthorizedWorkspaceUseCase } from '@/lib/core/application/authorized-workspace-use-case'
import type { OrchestrationErrorCode } from '@/lib/core/orchestration/types'
import { generateRequestId } from '@/lib/core/utils/request'
import { compilePlan } from '@/lib/nexora/copilot/compile'
import { loadCopilotCompileContext } from '@/lib/nexora/copilot/context'
import { generatePlan } from '@/lib/nexora/copilot/generate'
import { copilotOperations } from '@/lib/nexora/copilot/operations'
import type { CopilotPlan } from '@/lib/nexora/copilot/plan'
import { notifyWorkspaceWorkflowsChanged } from '@/lib/realtime/notify'
import { WorkflowImportError } from '@/lib/workflows/application/import-error'
import {
  type ImportedWorkflow,
  importWorkflowIntoWorkspaceTransition,
} from '@/lib/workflows/operations/import-workflow'
import { resolveActiveWorkspaceApplicationContext } from '@/lib/workspaces/application/context'

interface GenerateCopilotPlanInput {
  workspaceId: string
  description: string
  currentPlan?: CopilotPlan
}

/**
 * Drafts a workflow plan with the Nexora model from a description (or applies a described change
 * to `currentPlan`), against the workspace's knowledge bases and connected services. Nothing is
 * stored or run; failures are `CopilotGenerationError`s.
 */
export const generateCopilotPlan = defineAuthorizedWorkspaceUseCase({
  operation: copilotOperations.generatePlan,
  resolveContext: ({ input }: { input: GenerateCopilotPlanInput }) =>
    resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions: {},
  execute: async ({ input, context }) =>
    generatePlan({
      description: input.description,
      currentPlan: input.currentPlan,
      context: await loadCopilotCompileContext(context.workspaceId),
    }),
})

interface CreateWorkflowFromPlanInput {
  workspaceId: string
  plan: CopilotPlan
  folderId?: string
}

interface CreatedCopilotWorkflow {
  workflow: ImportedWorkflow
  /** The compiler's (unknown services or bases) then the importer's, in that order. */
  warnings: string[]
}

function importErrorCode(status: number): OrchestrationErrorCode {
  if (status === 400) return 'validation'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not_found'
  if (status === 423) return 'locked'
  return 'internal'
}

/**
 * Compiles a reviewed plan against the workspace's current knowledge bases and services, and
 * imports it as a new workflow named after the plan's title, in `folderId` (checked to belong to
 * the workspace) or at the root. A plan that cannot compile throws `CopilotPlanError`.
 */
export const createWorkflowFromPlan = defineAuthorizedWorkspaceUseCase({
  operation: copilotOperations.createWorkflow,
  resolveContext: ({ input }: { input: CreateWorkflowFromPlanInput }) =>
    resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions: {},
  async execute({ principal, input, context }): Promise<CreatedCopilotWorkflow> {
    const compiled = compilePlan(input.plan, await loadCopilotCompileContext(context.workspaceId))
    const imported = await importWorkflowIntoWorkspaceTransition({
      workspaceId: context.workspaceId,
      folderId: input.folderId,
      name: input.plan.title,
      description: input.plan.description,
      workflow: JSON.stringify(compiled.state),
      userId: requirePrincipalSubjectUserId(principal),
      capabilityUserId: capabilityGovernedPrincipalUserId(principal),
      requestId: generateRequestId(),
    })
    if (!imported.success) {
      throw new WorkflowImportError(
        importErrorCode(imported.status),
        imported.error,
        imported.details
      )
    }
    return {
      workflow: imported.workflow,
      warnings: [...compiled.warnings, ...imported.warnings],
    }
  },
  projectAudit: ({ result }) => ({
    action: AuditAction.WORKFLOW_CREATED,
    resourceType: AuditResourceType.WORKFLOW,
    resourceId: result.workflow.id,
    resourceName: result.workflow.name,
    description: `Created workflow "${result.workflow.name}"`,
    metadata: {
      name: result.workflow.name,
      description: result.workflow.description || undefined,
      workspaceId: result.workflow.workspaceId,
      folderId: result.workflow.folderId || undefined,
      blocksCount: result.workflow.blocks.length,
      source: 'nexora-copilot',
    },
  }),
  afterSuccess: ({ result }) => notifyWorkspaceWorkflowsChanged(result.workflow.workspaceId),
})
