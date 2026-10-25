/**
 * Failure modes owned here (a member's scheduled tasks):
 * - another member's task is answered as not found before the workspace is authorized and before
 *   anything is changed, disabled, deleted or read;
 * - a plan that does not run on a schedule is refused (nothing created), with a reason the page
 *   words as « précisez quand la tâche doit s'exécuter »;
 * - a task is created, deployed and recorded together: a deployment that fails leaves no workflow
 *   and no task behind;
 * - the Copilot knows the services the member connected themselves, not only the workspace's;
 * - disabling and enabling act on the task's own schedule only.
 */

import { createSessionPrincipal } from '@sim/testing/factories/principal.factory'
import {
  workflowsOrchestrationMock,
  workflowsOrchestrationMockFns,
} from '@sim/testing/mocks/workflows-orchestration.mock'
import { workspaceAuthzMock, workspaceAuthzMockFns } from '@sim/testing/mocks/workspace-authz.mock'
import {
  workspaceContextMock,
  workspaceContextMockFns,
} from '@sim/testing/mocks/workspace-context.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  generatePlan: vi.fn(),
  loadCopilotCompileContext: vi.fn(),
  createWorkflowFromPlan: vi.fn(),
  listPersonalConnections: vi.fn(),
  ensureTasksFolder: vi.fn(),
  loadTask: vi.fn(),
  listTasks: vi.fn(),
  insertTask: vi.fn(),
  deleteTask: vi.fn(),
  setScheduleEnabled: vi.fn(),
  loadSchedule: vi.fn(),
  listRecentRuns: vi.fn(),
}))

vi.mock('@sim/platform-authz/workspace', () => workspaceAuthzMock)
vi.mock('@/lib/workspaces/application/context', () => workspaceContextMock)
vi.mock('@/lib/nexora/copilot/generate', () => ({ generatePlan: mocks.generatePlan }))
vi.mock('@/lib/nexora/copilot/context', () => ({
  loadCopilotCompileContext: mocks.loadCopilotCompileContext,
}))
vi.mock('@/lib/nexora/copilot/use-cases', () => ({
  createWorkflowFromPlan: { execute: mocks.createWorkflowFromPlan },
}))
vi.mock('@/lib/workflows/orchestration', () => workflowsOrchestrationMock)
vi.mock('@/lib/nexora/connect-admin', () => ({
  listPersonalConnections: mocks.listPersonalConnections,
}))
vi.mock('@/lib/nexora/assistant/tasks/folder', () => ({
  ensureTasksFolder: mocks.ensureTasksFolder,
}))
vi.mock('@/lib/nexora/assistant/tasks/repository', () => ({
  loadTask: mocks.loadTask,
  listTasks: mocks.listTasks,
  insertTask: mocks.insertTask,
  deleteTask: mocks.deleteTask,
  setScheduleEnabled: mocks.setScheduleEnabled,
  loadSchedule: mocks.loadSchedule,
  listRecentRuns: mocks.listRecentRuns,
}))

import {
  AssistantTaskPlanError,
  createAssistantTask,
  deleteAssistantTask,
  listAssistantTaskRuns,
  planAssistantTask,
  setAssistantTaskEnabled,
} from '@/lib/nexora/assistant/tasks/use-cases'
import type { CopilotPlan } from '@/lib/nexora/copilot/plan'

const performFullDeploy = workflowsOrchestrationMockFns.mockPerformFullDeploy
const performDeleteWorkflow = workflowsOrchestrationMockFns.mockPerformDeleteWorkflow

const WORKSPACE_ID = 'workspace-1'
const owner = createSessionPrincipal({ userId: 'owner', sessionId: 'session-owner' })
const colleague = createSessionPrincipal({ userId: 'colleague', sessionId: 'session-colleague' })

const scheduledPlan: CopilotPlan = {
  title: 'Résumé des e-mails',
  trigger: { kind: 'planification', frequency: 'jour', time: '08:00' },
  steps: [
    {
      kind: 'agent',
      name: 'resume',
      instructions: 'Résume les e-mails reçus.',
      message: 'Résume mes e-mails.',
      services: ['gmail'],
      knowledgeBases: [],
    },
  ],
}
const manualPlan: CopilotPlan = { ...scheduledPlan, trigger: { kind: 'manuel', fields: [] } }

const taskRow = {
  id: 'task-1',
  workspaceId: WORKSPACE_ID,
  userId: 'owner',
  workflowId: 'workflow-1',
  title: 'Résumé des e-mails',
  request: 'tous les matins à 8 h, résume mes e-mails',
  createdAt: new Date('2026-10-01T10:00:00.000Z'),
}
const schedule = {
  status: 'active',
  cronExpression: '0 8 * * *',
  timezone: 'Europe/Paris',
  nextRunAt: new Date('2026-10-02T06:00:00.000Z'),
  lastRanAt: null,
}

beforeEach(() => {
  workspaceAuthzMockFns.mockResolveEffectiveWorkspacePermission.mockResolvedValue('write')
  workspaceContextMockFns.mockLoadWorkspaceApplicationContext.mockClear()
  mocks.loadTask.mockResolvedValue(taskRow)
  mocks.loadCopilotCompileContext.mockResolvedValue({ model: 'm', knowledgeBases: [] })
  mocks.listPersonalConnections.mockResolvedValue([
    { id: 'c-1', service: 'gmail', authType: 'oauth2' },
  ])
  mocks.generatePlan.mockResolvedValue({
    plan: scheduledPlan,
    summary: ['Tous les jours à 8 h', 'Résume'],
    warnings: [],
  })
  mocks.ensureTasksFolder.mockResolvedValue('folder-1')
  mocks.createWorkflowFromPlan.mockResolvedValue({
    workflow: { id: 'workflow-1', name: 'Résumé des e-mails' },
    warnings: [],
  })
  performFullDeploy.mockResolvedValue({ success: true })
  performDeleteWorkflow.mockResolvedValue({ success: true })
  mocks.insertTask.mockResolvedValue(taskRow)
  mocks.loadSchedule.mockResolvedValue(schedule)
  mocks.setScheduleEnabled.mockResolvedValue({ ...schedule, status: 'disabled', nextRunAt: null })
  mocks.deleteTask.mockResolvedValue(true)
  mocks.listRecentRuns.mockResolvedValue([])
})

describe('task ownership', () => {
  const attempts: [string, () => Promise<unknown>][] = [
    [
      'disable',
      () =>
        setAssistantTaskEnabled.execute({
          principal: colleague,
          input: { taskId: 'task-1', enabled: false },
        }),
    ],
    [
      'delete',
      () => deleteAssistantTask.execute({ principal: colleague, input: { taskId: 'task-1' } }),
    ],
    [
      'read the runs of',
      () => listAssistantTaskRuns.execute({ principal: colleague, input: { taskId: 'task-1' } }),
    ],
  ]

  it.each(attempts)(
    'answers not found to another member who tries to %s a task',
    async (_name, attempt) => {
      await expect(attempt()).rejects.toMatchObject({ code: 'not_found' })
      expect(workspaceAuthzMockFns.mockResolveEffectiveWorkspacePermission).not.toHaveBeenCalled()
      expect(mocks.setScheduleEnabled).not.toHaveBeenCalled()
      expect(performDeleteWorkflow).not.toHaveBeenCalled()
      expect(mocks.listRecentRuns).not.toHaveBeenCalled()
    }
  )
})

describe('planAssistantTask', () => {
  const input = { workspaceId: WORKSPACE_ID, request: 'tous les matins à 8 h, résume mes e-mails' }

  it('plans with the services the member connected themselves, and asks for a schedule', async () => {
    const result = await planAssistantTask.execute({ principal: owner, input })
    expect(mocks.listPersonalConnections).toHaveBeenCalledWith('owner')
    expect(mocks.loadCopilotCompileContext).toHaveBeenCalledWith(WORKSPACE_ID, {
      extraServices: ['gmail'],
    })
    const asked = mocks.generatePlan.mock.calls[0][0] as { description: string }
    expect(asked.description).toContain('tous les matins à 8 h, résume mes e-mails')
    expect(asked.description.toLowerCase()).toContain('planification')
    expect(result.plan).toEqual(scheduledPlan)
    expect(result.schedule).toBe('Tous les jours à 8 h')
  })

  it('refuses a plan that does not run on a schedule', async () => {
    mocks.generatePlan.mockResolvedValue({ plan: manualPlan, summary: [], warnings: [] })
    const error = await planAssistantTask
      .execute({ principal: owner, input })
      .catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(AssistantTaskPlanError)
    expect(error).toMatchObject({ reason: 'no-schedule' })
  })

  it('still plans when Nexora Connect cannot list the member’s connections', async () => {
    mocks.listPersonalConnections.mockRejectedValue(new Error('down'))
    await planAssistantTask.execute({ principal: owner, input })
    expect(mocks.loadCopilotCompileContext).toHaveBeenCalledWith(WORKSPACE_ID, {
      extraServices: [],
    })
  })
})

describe('createAssistantTask', () => {
  const input = {
    workspaceId: WORKSPACE_ID,
    request: 'tous les matins à 8 h, résume mes e-mails',
    plan: scheduledPlan,
  }

  it('creates the workflow, deploys it and records the task, in that order', async () => {
    const result = await createAssistantTask.execute({ principal: owner, input })
    expect(mocks.createWorkflowFromPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { workspaceId: WORKSPACE_ID, plan: scheduledPlan, folderId: 'folder-1' },
      })
    )
    expect(performFullDeploy).toHaveBeenCalledWith(
      expect.objectContaining({ workflowId: 'workflow-1', userId: 'owner' })
    )
    expect(mocks.insertTask).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      userId: 'owner',
      workflowId: 'workflow-1',
      title: 'Résumé des e-mails',
      request: input.request,
    })
    expect(result.task.id).toBe('task-1')
    expect(result.schedule).toMatchObject({ cronExpression: '0 8 * * *' })
  })

  it('refuses a plan without a schedule before creating anything', async () => {
    await expect(
      createAssistantTask.execute({ principal: owner, input: { ...input, plan: manualPlan } })
    ).rejects.toMatchObject({ reason: 'no-schedule' })
    expect(mocks.createWorkflowFromPlan).not.toHaveBeenCalled()
  })

  it('leaves no workflow and no task behind when the deployment fails', async () => {
    performFullDeploy.mockResolvedValue({ success: false, error: 'invalid schedule' })
    await expect(createAssistantTask.execute({ principal: owner, input })).rejects.toMatchObject({
      reason: 'deploy-failed',
    })
    expect(performDeleteWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ workflowId: 'workflow-1', userId: 'owner' })
    )
    expect(mocks.insertTask).not.toHaveBeenCalled()
  })

  it('needs write access to the workspace', async () => {
    workspaceAuthzMockFns.mockResolveEffectiveWorkspacePermission.mockResolvedValue('read')
    await expect(createAssistantTask.execute({ principal: owner, input })).rejects.toMatchObject({
      code: 'forbidden',
    })
    expect(mocks.createWorkflowFromPlan).not.toHaveBeenCalled()
  })
})

describe('enabling, disabling and deleting a task', () => {
  it('acts on the task’s own schedule', async () => {
    const result = await setAssistantTaskEnabled.execute({
      principal: owner,
      input: { taskId: 'task-1', enabled: false },
    })
    expect(mocks.setScheduleEnabled).toHaveBeenCalledWith('workflow-1', false)
    expect(result.schedule).toMatchObject({ status: 'disabled' })
  })

  it('answers not found when the task’s schedule is gone', async () => {
    mocks.setScheduleEnabled.mockResolvedValue(null)
    await expect(
      setAssistantTaskEnabled.execute({
        principal: owner,
        input: { taskId: 'task-1', enabled: true },
      })
    ).rejects.toMatchObject({ code: 'not_found' })
  })

  it('deletes the task’s workflow and forgets the task', async () => {
    await deleteAssistantTask.execute({ principal: owner, input: { taskId: 'task-1' } })
    expect(performDeleteWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: 'workflow-1',
        userId: 'owner',
        skipLastWorkflowGuard: true,
      })
    )
    expect(mocks.deleteTask).toHaveBeenCalledWith('task-1')
  })

  it('still forgets a task whose workflow was already deleted in the editor', async () => {
    performDeleteWorkflow.mockResolvedValue({ success: false, errorCode: 'not_found' })
    await deleteAssistantTask.execute({ principal: owner, input: { taskId: 'task-1' } })
    expect(mocks.deleteTask).toHaveBeenCalledWith('task-1')
  })
})

describe('listAssistantTaskRuns', () => {
  it('reads the runs of the task’s workflow only', async () => {
    mocks.listRecentRuns.mockResolvedValue([
      {
        executionId: 'e-1',
        status: 'completed',
        trigger: 'schedule',
        startedAt: new Date(),
        endedAt: new Date(),
        output: 'Trois e-mails.',
      },
    ])
    const { runs } = await listAssistantTaskRuns.execute({
      principal: owner,
      input: { taskId: 'task-1' },
    })
    expect(mocks.listRecentRuns).toHaveBeenCalledWith(WORKSPACE_ID, 'workflow-1', 10)
    expect(runs).toHaveLength(1)
  })
})
