import {
  requirePrincipalSubjectUserId,
  type SessionPrincipal,
  toPrincipalActor,
} from '@sim/auth/principal'
import { createLogger } from '@sim/logger'
import { defineAuthorizedWorkspaceUseCase } from '@/lib/core/application/authorized-workspace-use-case'
import { OrchestrationError, type OrchestrationErrorCode } from '@/lib/core/orchestration/types'
import { generateRequestId } from '@/lib/core/utils/request'
import { assistantOperations } from '@/lib/nexora/assistant/operations'
import { ensureTasksFolder } from '@/lib/nexora/assistant/tasks/folder'
import {
  deleteTask,
  insertTask,
  listRecentRuns,
  listTasks,
  loadSchedule,
  loadTask,
  setScheduleEnabled,
  type TaskRecord,
} from '@/lib/nexora/assistant/tasks/repository'
import { listPersonalConnections } from '@/lib/nexora/connect-admin'
import { loadCopilotCompileContext } from '@/lib/nexora/copilot/context'
import { generatePlan } from '@/lib/nexora/copilot/generate'
import type { CopilotPlan } from '@/lib/nexora/copilot/plan'
import { createWorkflowFromPlan } from '@/lib/nexora/copilot/use-cases'
import { performDeleteWorkflow, performFullDeploy } from '@/lib/workflows/orchestration'
import {
  type ActiveWorkspaceApplicationContext,
  resolveActiveWorkspaceApplicationContext,
} from '@/lib/workspaces/application/context'

const logger = createLogger('NexoraAssistantTasks')

const RECENT_RUNS = 10

/**
 * A task that cannot be planned or created: `no-schedule` (the request says nothing about when
 * it runs, so the plan has no schedule) or `deploy-failed` (the schedule could not be started).
 */
export class AssistantTaskPlanError extends OrchestrationError {
  constructor(
    readonly reason: 'no-schedule' | 'deploy-failed',
    code: OrchestrationErrorCode,
    detail?: string
  ) {
    super(code, detail ?? `The task cannot be created (${reason})`)
    this.name = 'AssistantTaskPlanError'
  }
}

interface PlanTaskInput {
  workspaceId: string
  request: string
}

interface CreateTaskInput extends PlanTaskInput {
  plan: CopilotPlan
}

interface WorkspaceInput {
  workspaceId: string
}

interface TaskInput {
  taskId: string
}

interface OwnedTaskContext extends ActiveWorkspaceApplicationContext {
  task: TaskRecord
}

function taskNotFound(): never {
  throw new OrchestrationError('not_found', 'Task not found')
}

/** Another member's task is not found, and is answered before the workspace is authorized. */
async function resolveOwnedTaskContext(
  principal: SessionPrincipal,
  taskId: string
): Promise<OwnedTaskContext> {
  const task = await loadTask(taskId)
  if (!task || task.userId !== principal.userId) taskNotFound()
  return { ...(await resolveActiveWorkspaceApplicationContext(task.workspaceId)), task }
}

function ownedTaskContext({ principal, input }: { principal: SessionPrincipal; input: TaskInput }) {
  return resolveOwnedTaskContext(principal, input.taskId)
}

function assertScheduled(plan: CopilotPlan): void {
  if (plan.trigger.kind !== 'planification') {
    throw new AssistantTaskPlanError('no-schedule', 'validation')
  }
}

/** The services the member connected themselves; none when Nexora Connect cannot be asked. */
async function personalServices(userId: string): Promise<string[]> {
  try {
    const connections = await listPersonalConnections(userId)
    return [...new Set(connections.map((connection) => connection.service))]
  } catch (error) {
    logger.warn('Personal connections not listed for a task plan', { error })
    return []
  }
}

/**
 * Drafts the plan of a scheduled task from what the member said (« tous les matins à 8 h, résume
 * mes e-mails »), with the Copilot, knowing the services the member connected themselves. Nothing
 * is created; a request that gives no schedule is refused.
 */
export const planAssistantTask = defineAuthorizedWorkspaceUseCase({
  operation: assistantOperations.planTask,
  resolveContext: ({ input }: { input: PlanTaskInput }) =>
    resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions: {},
  async execute({ principal, context, input, request }) {
    const userId = requirePrincipalSubjectUserId(principal)
    const extraServices = await personalServices(userId)
    const generated = await generatePlan({
      description: `Tâche personnelle planifiée : le déclencheur doit être une planification, jamais un lancement manuel. ${input.request}`,
      context: await loadCopilotCompileContext(context.workspaceId, { extraServices }),
      signal: request?.signal,
      trace: {
        source: 'copilot',
        workspaceId: context.workspaceId,
        userId,
        name: 'Tâche planifiée',
      },
    })
    assertScheduled(generated.plan)
    return {
      plan: generated.plan,
      summary: generated.summary,
      warnings: generated.warnings,
      schedule: generated.summary[0] ?? '',
    }
  },
})

/**
 * Creates the member's task from a reviewed plan: the workflow (in « Tâches planifiées »), its
 * deployment — a schedule only fires for a deployed workflow — and the task's record, together:
 * when the deployment fails the workflow is deleted again and nothing is recorded.
 */
export const createAssistantTask = defineAuthorizedWorkspaceUseCase({
  operation: assistantOperations.createTask,
  resolveContext: ({ input }: { input: CreateTaskInput }) =>
    resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions: {},
  async execute({ principal, context, input, request }) {
    assertScheduled(input.plan)
    const userId = requirePrincipalSubjectUserId(principal)
    const folderId = await ensureTasksFolder(context.workspaceId, userId)
    const created = await createWorkflowFromPlan.execute({
      principal,
      input: { workspaceId: context.workspaceId, plan: input.plan, folderId },
      request,
    })
    const workflowId = created.workflow.id
    const deployed = await performFullDeploy({
      workflowId,
      userId,
      actorId: userId,
      actor: toPrincipalActor(principal),
      requestId: generateRequestId(),
    })
    if (!deployed.success) {
      await performDeleteWorkflow({ workflowId, userId, skipLastWorkflowGuard: true }).catch(
        (error: unknown) =>
          logger.warn('Workflow of a task that failed to deploy was not deleted', {
            workflowId,
            error,
          })
      )
      throw new AssistantTaskPlanError('deploy-failed', 'internal', deployed.error)
    }
    const task = await insertTask({
      workspaceId: context.workspaceId,
      userId,
      workflowId,
      title: created.workflow.name,
      request: input.request,
    })
    return {
      task,
      schedule: await loadSchedule(workflowId),
      warnings: created.warnings,
    }
  },
})

export const listAssistantTasks = defineAuthorizedWorkspaceUseCase({
  operation: assistantOperations.listTasks,
  resolveContext: ({ input }: { input: WorkspaceInput }) =>
    resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions: {},
  execute: async ({ principal, context }) => ({
    tasks: await listTasks(context.workspaceId, principal.userId),
  }),
})

export const setAssistantTaskEnabled = defineAuthorizedWorkspaceUseCase({
  operation: assistantOperations.setTaskEnabled,
  resolveContext: ({
    principal,
    input,
  }: {
    principal: SessionPrincipal
    input: TaskInput & { enabled: boolean }
  }) => resolveOwnedTaskContext(principal, input.taskId),
  authorizationOptions: {},
  async execute({ context, input }) {
    const schedule = await setScheduleEnabled(context.task.workflowId, input.enabled)
    if (!schedule) taskNotFound()
    return { task: context.task, schedule }
  },
})

/** Deletes the task's workflow (and so its schedule) and forgets the task. */
export const deleteAssistantTask = defineAuthorizedWorkspaceUseCase({
  operation: assistantOperations.deleteTask,
  resolveContext: ownedTaskContext,
  authorizationOptions: {},
  async execute({ principal, context }) {
    const deleted = await performDeleteWorkflow({
      workflowId: context.task.workflowId,
      userId: requirePrincipalSubjectUserId(principal),
      skipLastWorkflowGuard: true,
    })
    // Already deleted in the editor: the task is forgotten all the same.
    if (!deleted.success && deleted.errorCode !== 'not_found') {
      throw new OrchestrationError(
        deleted.errorCode ?? 'internal',
        deleted.error ?? 'The task was not deleted'
      )
    }
    await deleteTask(context.task.id)
    return { taskId: context.task.id }
  },
})

export const listAssistantTaskRuns = defineAuthorizedWorkspaceUseCase({
  operation: assistantOperations.listTaskRuns,
  resolveContext: ownedTaskContext,
  authorizationOptions: {},
  execute: async ({ context }) => ({
    runs: await listRecentRuns(context.workspaceId, context.task.workflowId, RECENT_RUNS),
  }),
})
