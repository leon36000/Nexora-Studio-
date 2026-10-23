/**
 * Réglages › Consommation against real PostgreSQL: a run refused at admission (monthly budget,
 * rate limit…) leaves a log row so its owner sees why nothing ran, but it is not an execution.
 */
import { db } from '@sim/db'
import {
  user,
  workflow,
  workflowExecutionLogs,
  workflowExecutionSnapshots,
  workspace,
} from '@sim/db/schema'
import { deleteWorkspaceFixture, insertWorkspaceFixture } from '@sim/db/testing/workspace-fixtures'
import { generateId } from '@sim/utils/id'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { markRefusedRunLog } from '@/lib/execution/refused-run-log'
import { readWorkspaceConsumption } from '@/lib/nexora/consumption/by-workspace'

const prefix = generateId()
const ids = {
  owner: `consumption-${prefix}`,
  workspace: generateId(),
  workflow: generateId(),
  snapshot: generateId(),
  refused: `${prefix}-refused`,
}
const PERIOD = {
  start: new Date('2031-02-28T23:00:00.000Z'),
  end: new Date('2031-03-31T22:00:00.000Z'),
  timeZone: 'Europe/Paris',
}

function run(executionId: string, status: 'completed' | 'failed', day: number) {
  return {
    id: generateId(),
    workflowId: ids.workflow,
    workspaceId: ids.workspace,
    executionId,
    stateSnapshotId: ids.snapshot,
    level: status === 'failed' ? 'error' : 'info',
    status,
    trigger: 'schedule',
    startedAt: new Date(Date.UTC(2031, 2, day, 9)),
    totalDurationMs: 1,
    executionData: {},
  }
}

beforeAll(async () => {
  const now = new Date()
  await db.insert(user).values({
    id: ids.owner,
    name: 'Consumption',
    email: `${ids.owner}@consumption.test`,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  })
  await insertWorkspaceFixture(db, {
    id: ids.workspace,
    name: 'Consumption',
    ownerId: ids.owner,
    billedAccountUserId: ids.owner,
  })
  await db.insert(workflow).values({
    id: ids.workflow,
    userId: ids.owner,
    workspaceId: ids.workspace,
    name: 'Nightly report',
    lastSynced: now,
    createdAt: now,
    updatedAt: now,
  })
  await db.insert(workflowExecutionSnapshots).values({
    id: ids.snapshot,
    workflowId: ids.workflow,
    stateHash: ids.snapshot,
    stateData: {},
  })
  await db
    .insert(workflowExecutionLogs)
    .values([
      run(`${prefix}-ok`, 'completed', 3),
      run(`${prefix}-failed`, 'failed', 4),
      run(ids.refused, 'failed', 5),
    ])
  await markRefusedRunLog(ids.refused, 'MONTHLY_BUDGET_EXCEEDED')
})

afterAll(async () => {
  await db.delete(workflowExecutionLogs).where(eq(workflowExecutionLogs.workspaceId, ids.workspace))
  await db.delete(workflowExecutionSnapshots).where(eq(workflowExecutionSnapshots.id, ids.snapshot))
  await db.delete(workflow).where(eq(workflow.id, ids.workflow))
  await deleteWorkspaceFixture(db, eq(workspace.id, ids.workspace))
  await db.delete(user).where(eq(user.id, ids.owner))
})

describe('executions per workspace', () => {
  it('counts the runs that ran, failed ones included, but not the runs refused at admission', async () => {
    const report = await readWorkspaceConsumption({ ...PERIOD, executor: db })

    expect(report.workspaces.find((entry) => entry.workspaceId === ids.workspace)).toMatchObject({
      executions: 2,
    })
    expect(report.days.find((day) => day.date === '2031-03-05')?.executions ?? 0).toBe(0)
    expect(report.days.find((day) => day.date === '2031-03-04')?.executions).toBe(1)
  })
})
