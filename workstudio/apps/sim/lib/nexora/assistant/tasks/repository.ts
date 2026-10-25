import { db } from '@sim/db'
import {
  nexoraAssistantTask,
  workflow,
  workflowExecutionLogs,
  workflowSchedule,
} from '@sim/db/schema'
import { generateId } from '@sim/utils/id'
import { toRecord } from '@sim/utils/object'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { materializeExecutionDataForDisplay } from '@/lib/logs/execution/trace-store'
import { validateCronExpression } from '@/lib/workflows/schedules/utils'

const TASK_LIST_LIMIT = 50
/** A run's result is shown in the Assistant as a short text. */
const RUN_OUTPUT_MAX_CHARS = 4_000

export interface TaskRecord {
  id: string
  workspaceId: string
  userId: string
  workflowId: string
  title: string
  request: string
  createdAt: Date
}

export interface TaskSchedule {
  status: string
  cronExpression: string | null
  timezone: string
  nextRunAt: Date | null
  lastRanAt: Date | null
}

export interface TaskWithSchedule extends TaskRecord {
  /** `null` when the schedule is gone (the workflow was undeployed in the editor). */
  schedule: TaskSchedule | null
}

export interface TaskRun {
  executionId: string
  status: string
  trigger: string
  startedAt: Date
  endedAt: Date | null
  /** The workflow's final output, as short text; `null` when the run has none. */
  output: string | null
}

const taskColumns = {
  id: nexoraAssistantTask.id,
  workspaceId: nexoraAssistantTask.workspaceId,
  userId: nexoraAssistantTask.userId,
  workflowId: nexoraAssistantTask.workflowId,
  title: nexoraAssistantTask.title,
  request: nexoraAssistantTask.request,
  createdAt: nexoraAssistantTask.createdAt,
}

const scheduleColumns = {
  status: workflowSchedule.status,
  cronExpression: workflowSchedule.cronExpression,
  timezone: workflowSchedule.timezone,
  nextRunAt: workflowSchedule.nextRunAt,
  lastRanAt: workflowSchedule.lastRanAt,
}

export async function loadTask(taskId: string): Promise<TaskRecord | null> {
  const [row] = await db
    .select(taskColumns)
    .from(nexoraAssistantTask)
    .where(eq(nexoraAssistantTask.id, taskId))
    .limit(1)
  return row ?? null
}

export async function insertTask(values: {
  workspaceId: string
  userId: string
  workflowId: string
  title: string
  request: string
}): Promise<TaskRecord> {
  const [row] = await db
    .insert(nexoraAssistantTask)
    .values({ id: generateId(), ...values })
    .returning(taskColumns)
  if (!row) throw new Error('Failed to store the Assistant task')
  return row
}

export async function deleteTask(taskId: string): Promise<boolean> {
  const deleted = await db
    .delete(nexoraAssistantTask)
    .where(eq(nexoraAssistantTask.id, taskId))
    .returning({ id: nexoraAssistantTask.id })
  return deleted.length > 0
}

/** The workflow's live schedule, `null` when it has none. */
export async function loadSchedule(workflowId: string): Promise<TaskSchedule | null> {
  const [row] = await db
    .select(scheduleColumns)
    .from(workflowSchedule)
    .where(and(eq(workflowSchedule.workflowId, workflowId), isNull(workflowSchedule.archivedAt)))
    .limit(1)
  return row ?? null
}

/**
 * One member's tasks of one workspace, newest first, with their schedules. A task whose workflow
 * was archived in the editor is not listed.
 */
export async function listTasks(workspaceId: string, userId: string): Promise<TaskWithSchedule[]> {
  const rows = await db
    .select({ ...taskColumns, ...scheduleColumns })
    .from(nexoraAssistantTask)
    .innerJoin(workflow, eq(workflow.id, nexoraAssistantTask.workflowId))
    .leftJoin(
      workflowSchedule,
      and(
        eq(workflowSchedule.workflowId, nexoraAssistantTask.workflowId),
        isNull(workflowSchedule.archivedAt)
      )
    )
    .where(
      and(
        eq(nexoraAssistantTask.workspaceId, workspaceId),
        eq(nexoraAssistantTask.userId, userId),
        isNull(workflow.archivedAt)
      )
    )
    .orderBy(desc(nexoraAssistantTask.createdAt))
    .limit(TASK_LIST_LIMIT)
  return rows.map((row) => ({
    id: row.id,
    workspaceId: row.workspaceId,
    userId: row.userId,
    workflowId: row.workflowId,
    title: row.title,
    request: row.request,
    createdAt: row.createdAt,
    schedule:
      row.status === null
        ? null
        : {
            status: row.status,
            cronExpression: row.cronExpression,
            timezone: row.timezone ?? 'UTC',
            nextRunAt: row.nextRunAt,
            lastRanAt: row.lastRanAt,
          },
  }))
}

/**
 * Turns the task's schedule off, or on again with its next run recomputed, like the editor's
 * schedule switch does. `null` when the workflow has no schedule or its expression is no longer
 * valid.
 */
export async function setScheduleEnabled(
  workflowId: string,
  enabled: boolean
): Promise<TaskSchedule | null> {
  const current = await loadSchedule(workflowId)
  if (!current) return null
  const live = and(eq(workflowSchedule.workflowId, workflowId), isNull(workflowSchedule.archivedAt))
  if (!enabled) {
    const [row] = await db
      .update(workflowSchedule)
      .set({ status: 'disabled', nextRunAt: null, lastQueuedAt: null, updatedAt: new Date() })
      .where(live)
      .returning(scheduleColumns)
    return row ?? null
  }
  if (!current.cronExpression) return null
  const next = validateCronExpression(current.cronExpression, current.timezone || 'UTC')
  if (!next.isValid || !next.nextRun) return null
  const [row] = await db
    .update(workflowSchedule)
    .set({
      status: 'active',
      failedCount: 0,
      infraRetryCount: 0,
      updatedAt: new Date(),
      nextRunAt: next.nextRun,
    })
    .where(live)
    .returning(scheduleColumns)
  return row ?? null
}

function outputText(finalOutput: unknown): string | null {
  if (finalOutput === undefined || finalOutput === null) return null
  const record = toRecord(finalOutput)
  const candidate = record.content ?? record.response ?? record.result ?? finalOutput
  const text = typeof candidate === 'string' ? candidate : JSON.stringify(candidate)
  return text.length > RUN_OUTPUT_MAX_CHARS ? `${text.slice(0, RUN_OUTPUT_MAX_CHARS)}…` : text
}

/** The workflow's most recent runs, newest first, each with its final output as short text. */
export async function listRecentRuns(
  workspaceId: string,
  workflowId: string,
  limit: number
): Promise<TaskRun[]> {
  const rows = await db
    .select({
      executionId: workflowExecutionLogs.executionId,
      status: workflowExecutionLogs.status,
      trigger: workflowExecutionLogs.trigger,
      startedAt: workflowExecutionLogs.startedAt,
      endedAt: workflowExecutionLogs.endedAt,
      executionData: workflowExecutionLogs.executionData,
    })
    .from(workflowExecutionLogs)
    .where(
      and(
        eq(workflowExecutionLogs.workspaceId, workspaceId),
        eq(workflowExecutionLogs.workflowId, workflowId)
      )
    )
    .orderBy(desc(workflowExecutionLogs.startedAt))
    .limit(limit)
  return Promise.all(
    rows.map(async ({ executionData, ...run }) => {
      const data = await materializeExecutionDataForDisplay(toRecord(executionData), {
        workspaceId,
        workflowId,
        executionId: run.executionId,
      }).catch(() => ({}))
      return { ...run, output: outputText(toRecord(data).finalOutput) }
    })
  )
}
