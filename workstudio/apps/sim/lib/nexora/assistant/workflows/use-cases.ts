import { requirePrincipalSubjectUserId, toPrincipalActor } from '@sim/auth/principal'
import { defineAuthorizedWorkspaceUseCase } from '@/lib/core/application/authorized-workspace-use-case'
import { OrchestrationError } from '@/lib/core/orchestration/types'
import { generateRequestId } from '@/lib/core/utils/request'
import { assistantOperations } from '@/lib/nexora/assistant/operations'
import { formFieldsFromState } from '@/lib/nexora/assistant/workflows/fields'
import {
  listPublishableWorkflows,
  listPublishedWorkflows,
  loadWorkflowFacts,
  publishWorkflow,
  unpublishWorkflow,
} from '@/lib/nexora/assistant/workflows/repository'
import { performFullDeploy } from '@/lib/workflows/orchestration'
import { resolveActiveWorkspaceApplicationContext } from '@/lib/workspaces/application/context'

/** The workflow could not be deployed, so it was not published; `detail` says why. */
export class AssistantWorkflowDeployError extends OrchestrationError {
  constructor(detail?: string) {
    super('conflict', detail ?? 'The workflow could not be deployed')
    this.name = 'AssistantWorkflowDeployError'
  }
}

interface WorkspaceInput {
  workspaceId: string
}

interface WorkflowInput extends WorkspaceInput {
  workflowId: string
}

/** The workflows published for the Assistant, each with the form its Start block describes. */
export const listAssistantWorkflows = defineAuthorizedWorkspaceUseCase({
  operation: assistantOperations.listWorkflows,
  resolveContext: ({ input }: { input: WorkspaceInput }) =>
    resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions: {},
  execute: async ({ context }) => {
    const rows = await listPublishedWorkflows(context.workspaceId)
    return {
      workflows: rows.map((row) => {
        const { fields, needsFiles } = formFieldsFromState(row.state)
        return {
          workflowId: row.workflowId,
          name: row.name,
          description: row.description,
          fields,
          needsFiles,
        }
      }),
    }
  },
})

/** What a writer may publish: the workspace's workflows, with whether each one already is. */
export const listPublishableAssistantWorkflows = defineAuthorizedWorkspaceUseCase({
  operation: assistantOperations.listPublishableWorkflows,
  resolveContext: ({ input }: { input: WorkspaceInput }) =>
    resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions: {},
  execute: async ({ context }) => ({
    workflows: await listPublishableWorkflows(context.workspaceId),
  }),
})

/**
 * Makes a workflow of the workspace available in the Assistant, deploying it first when it is not
 * (members launch the deployed version). A deployment that fails publishes nothing.
 */
export const publishAssistantWorkflow = defineAuthorizedWorkspaceUseCase({
  operation: assistantOperations.publishWorkflow,
  resolveContext: ({ input }: { input: WorkflowInput }) =>
    resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions: {},
  async execute({ principal, context, input }) {
    const facts = await loadWorkflowFacts(input.workflowId)
    if (!facts || facts.workspaceId !== context.workspaceId) {
      throw new OrchestrationError('not_found', 'Workflow not found')
    }
    const userId = requirePrincipalSubjectUserId(principal)
    if (!facts.isDeployed) {
      const deployed = await performFullDeploy({
        workflowId: facts.id,
        userId,
        actorId: userId,
        actor: toPrincipalActor(principal),
        requestId: generateRequestId(),
      })
      if (!deployed.success) throw new AssistantWorkflowDeployError(deployed.error)
    }
    await publishWorkflow(context.workspaceId, facts.id, userId)
    return { workflowId: facts.id }
  },
})

export const unpublishAssistantWorkflow = defineAuthorizedWorkspaceUseCase({
  operation: assistantOperations.unpublishWorkflow,
  resolveContext: ({ input }: { input: WorkflowInput }) =>
    resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions: {},
  async execute({ context, input }) {
    await unpublishWorkflow(context.workspaceId, input.workflowId)
    return { workflowId: input.workflowId }
  },
})
