/**
 * Failure modes owned here (workflows published in the Assistant):
 * - only writers publish and unpublish; any member lists what is published;
 * - a workflow of another workspace (or one that no longer exists) is answered as not found
 *   before anything is deployed or recorded;
 * - publishing a workflow that is not deployed deploys it first, and a deployment that fails
 *   publishes nothing;
 * - the list gives each workflow the form its Start block describes, and says when it asks for
 *   files, which the form cannot send.
 */

import { createSessionPrincipal } from '@sim/testing/factories/principal.factory'
import {
  workflowsOrchestrationMock,
  workflowsOrchestrationMockFns,
} from '@sim/testing/mocks/workflows-orchestration.mock'
import { workspaceAuthzMock, workspaceAuthzMockFns } from '@sim/testing/mocks/workspace-authz.mock'
import { workspaceContextMock } from '@sim/testing/mocks/workspace-context.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  listPublishedWorkflows: vi.fn(),
  listPublishableWorkflows: vi.fn(),
  loadWorkflowFacts: vi.fn(),
  publishWorkflow: vi.fn(),
  unpublishWorkflow: vi.fn(),
}))
const performFullDeploy = workflowsOrchestrationMockFns.mockPerformFullDeploy

vi.mock('@sim/platform-authz/workspace', () => workspaceAuthzMock)
vi.mock('@/lib/workspaces/application/context', () => workspaceContextMock)
vi.mock('@/lib/nexora/assistant/workflows/repository', () => ({
  listPublishedWorkflows: mocks.listPublishedWorkflows,
  listPublishableWorkflows: mocks.listPublishableWorkflows,
  loadWorkflowFacts: mocks.loadWorkflowFacts,
  publishWorkflow: mocks.publishWorkflow,
  unpublishWorkflow: mocks.unpublishWorkflow,
}))
vi.mock('@/lib/workflows/orchestration', () => workflowsOrchestrationMock)

import {
  AssistantWorkflowDeployError,
  listAssistantWorkflows,
  listPublishableAssistantWorkflows,
  publishAssistantWorkflow,
  unpublishAssistantWorkflow,
} from '@/lib/nexora/assistant/workflows/use-cases'

const WORKSPACE_ID = 'workspace-1'
const writer = createSessionPrincipal({ userId: 'writer', sessionId: 'session-writer' })
const input = { workspaceId: WORKSPACE_ID, workflowId: 'workflow-1' }

beforeEach(() => {
  workspaceAuthzMockFns.mockResolveEffectiveWorkspacePermission.mockResolvedValue('write')
  mocks.loadWorkflowFacts.mockResolvedValue({
    id: 'workflow-1',
    workspaceId: WORKSPACE_ID,
    name: 'Devis client',
    isDeployed: true,
  })
  performFullDeploy.mockResolvedValue({ success: true })
})

describe('listAssistantWorkflows', () => {
  it('gives every member the published workflows with their forms', async () => {
    workspaceAuthzMockFns.mockResolveEffectiveWorkspacePermission.mockResolvedValue('read')
    mocks.listPublishedWorkflows.mockResolvedValue([
      {
        workflowId: 'workflow-1',
        name: 'Devis client',
        description: 'Rédige un devis',
        state: {
          blocks: {
            s: {
              type: 'start_trigger',
              subBlocks: { inputFormat: { value: [{ name: 'client', type: 'string' }] } },
            },
          },
        },
      },
      {
        workflowId: 'workflow-2',
        name: 'Contrôle de facture',
        description: null,
        state: {
          blocks: {
            s: {
              type: 'start_trigger',
              subBlocks: { inputFormat: { value: [{ name: 'facture', type: 'file[]' }] } },
            },
          },
        },
      },
    ])
    const { workflows } = await listAssistantWorkflows.execute({
      principal: writer,
      input: { workspaceId: WORKSPACE_ID },
    })
    expect(workflows).toEqual([
      {
        workflowId: 'workflow-1',
        name: 'Devis client',
        description: 'Rédige un devis',
        fields: [{ name: 'client', label: 'client', type: 'string', required: false, example: '' }],
        needsFiles: false,
      },
      {
        workflowId: 'workflow-2',
        name: 'Contrôle de facture',
        description: null,
        fields: [],
        needsFiles: true,
      },
    ])
  })
})

describe('publishing', () => {
  it('lists what a writer may publish, and refuses a reader', async () => {
    mocks.listPublishableWorkflows.mockResolvedValue([
      { workflowId: 'workflow-1', name: 'Devis client', isDeployed: true, published: false },
    ])
    expect(
      (
        await listPublishableAssistantWorkflows.execute({
          principal: writer,
          input: { workspaceId: WORKSPACE_ID },
        })
      ).workflows
    ).toHaveLength(1)
    workspaceAuthzMockFns.mockResolveEffectiveWorkspacePermission.mockResolvedValue('read')
    await expect(
      listPublishableAssistantWorkflows.execute({
        principal: writer,
        input: { workspaceId: WORKSPACE_ID },
      })
    ).rejects.toMatchObject({ code: 'forbidden' })
  })

  it('refuses a reader before looking at the workflow', async () => {
    workspaceAuthzMockFns.mockResolveEffectiveWorkspacePermission.mockResolvedValue('read')
    await expect(
      publishAssistantWorkflow.execute({ principal: writer, input })
    ).rejects.toMatchObject({
      code: 'forbidden',
    })
    expect(mocks.loadWorkflowFacts).not.toHaveBeenCalled()
    expect(mocks.publishWorkflow).not.toHaveBeenCalled()
  })

  it.each([
    [
      'of another workspace',
      { id: 'workflow-1', workspaceId: 'workspace-2', name: 'x', isDeployed: true },
    ],
    ['that does not exist', null],
  ])('answers not found for a workflow %s', async (_name, facts) => {
    mocks.loadWorkflowFacts.mockResolvedValue(facts)
    await expect(
      publishAssistantWorkflow.execute({ principal: writer, input })
    ).rejects.toMatchObject({
      code: 'not_found',
    })
    expect(performFullDeploy).not.toHaveBeenCalled()
    expect(mocks.publishWorkflow).not.toHaveBeenCalled()
  })

  it('publishes a deployed workflow as it is', async () => {
    await publishAssistantWorkflow.execute({ principal: writer, input })
    expect(performFullDeploy).not.toHaveBeenCalled()
    expect(mocks.publishWorkflow).toHaveBeenCalledWith(WORKSPACE_ID, 'workflow-1', 'writer')
  })

  it('deploys a workflow that is not deployed before publishing it', async () => {
    mocks.loadWorkflowFacts.mockResolvedValue({
      id: 'workflow-1',
      workspaceId: WORKSPACE_ID,
      name: 'Devis client',
      isDeployed: false,
    })
    await publishAssistantWorkflow.execute({ principal: writer, input })
    expect(performFullDeploy).toHaveBeenCalledWith(
      expect.objectContaining({ workflowId: 'workflow-1', userId: 'writer' })
    )
    expect(mocks.publishWorkflow).toHaveBeenCalled()
  })

  it('publishes nothing when the deployment fails', async () => {
    mocks.loadWorkflowFacts.mockResolvedValue({
      id: 'workflow-1',
      workspaceId: WORKSPACE_ID,
      name: 'Devis client',
      isDeployed: false,
    })
    performFullDeploy.mockResolvedValue({ success: false, error: 'Aucun agent configuré' })
    await expect(
      publishAssistantWorkflow.execute({ principal: writer, input })
    ).rejects.toBeInstanceOf(AssistantWorkflowDeployError)
    expect(mocks.publishWorkflow).not.toHaveBeenCalled()
  })

  it('unpublishes a workflow of the workspace for a writer', async () => {
    await unpublishAssistantWorkflow.execute({ principal: writer, input })
    expect(mocks.unpublishWorkflow).toHaveBeenCalledWith(WORKSPACE_ID, 'workflow-1')
  })
})
