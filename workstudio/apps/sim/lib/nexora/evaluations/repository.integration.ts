/**
 * Evaluations against real PostgreSQL: a name is unique per workspace whatever its case, a test set
 * used by a campaign cannot be deleted, a campaign keeps its own snapshot, two workers never claim
 * the same item, a campaign whose lease expired is adopted with its in-flight items put back,
 * a cancelled campaign stays cancelled, a due schedule starts once, and alerts are recorded once.
 */
import { db } from '@sim/db'
import { permissions, user, workspace } from '@sim/db/schema'
import { deleteWorkspaceFixture, insertWorkspaceFixture } from '@sim/db/testing/workspace-fixtures'
import { generateId } from '@sim/utils/id'
import { inArray } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'
import { OrchestrationError } from '@/lib/core/orchestration/types'
import type { RowDraft } from '@/lib/nexora/evaluations/import'
import {
  acknowledgeAlert,
  acquireCampaign,
  appendRows,
  cancelCampaign,
  claimDueSchedules,
  claimNextItem,
  completeItem,
  deleteCampaign,
  deleteDataset,
  finishCampaign,
  getCampaign,
  getDataset,
  heartbeat,
  insertAlerts,
  insertCampaignWithItems,
  insertDataset,
  insertSchedule,
  listAdoptableCampaignIds,
  listAlerts,
  listCampaigns,
  listDatasets,
  listItems,
  listRows,
  saveJudge,
  updateRow,
} from '@/lib/nexora/evaluations/repository'
import type { EvalTarget, JudgeConfig } from '@/lib/nexora/evaluations/types'

const userIds: string[] = []
const workspaceIds: string[] = []

async function seedWorkspace() {
  const userId = generateId()
  const workspaceId = generateId()
  userIds.push(userId)
  workspaceIds.push(workspaceId)
  const now = new Date()
  await db.insert(user).values({
    id: userId,
    name: 'Évaluations fixture',
    email: `${userId}@evaluations.test`,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  })
  await insertWorkspaceFixture(db, {
    id: workspaceId,
    name: 'Évaluations fixture',
    ownerId: userId,
    billedAccountUserId: userId,
  })
  await db.insert(permissions).values({
    id: generateId(),
    userId,
    entityType: 'workspace',
    entityId: workspaceId,
    permissionType: 'admin',
  })
  return { userId, workspaceId }
}

const draft = (input: string, overrides: Partial<RowDraft> = {}): RowDraft => ({
  input,
  expected: null,
  guidance: null,
  candidate: null,
  humanVerdict: null,
  humanNote: null,
  sourceRef: null,
  ...overrides,
})

const judgeConfig: JudgeConfig = { kind: 'contains', value: 'x', caseSensitive: false }
const targets: EvalTarget[] = [
  { key: 't1', label: 'Modèle A', kind: 'model', model: 'a', system: null },
  { key: 't2', label: 'Modèle B', kind: 'model', model: 'b', system: null },
]

async function seedCampaign(workspaceId: string, userId: string, rowCount = 3) {
  const dataset = await insertDataset({
    workspaceId,
    name: `Jeu ${generateId()}`,
    description: '',
    source: 'manual',
    createdBy: userId,
    rows: Array.from({ length: rowCount }, (_, index) => draft(`Question ${index}`)),
  })
  const judge = await saveJudge({
    workspaceId,
    name: `Juge ${generateId()}`,
    config: judgeConfig,
    createdBy: userId,
  })
  const rows = await listRows(dataset.id, { limit: 100, offset: 0 })
  const campaign = await insertCampaignWithItems({
    workspaceId,
    name: 'Campagne',
    datasetId: dataset.id,
    judgeId: judge.id,
    targets,
    concurrency: 2,
    alertThreshold: 0.8,
    scheduleId: null,
    createdBy: userId,
    rows,
  })
  return { dataset, judge, campaign }
}

async function codeOf(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise
    return undefined
  } catch (error) {
    if (error instanceof OrchestrationError) return error.code
    throw error
  }
}

afterEach(async () => {
  if (workspaceIds.length > 0) {
    // Deleting the workspace cascades to its test sets, judges, campaigns and schedules at once:
    // the references that refuse a direct delete are checked at the end of the statement.
    await deleteWorkspaceFixture(db, inArray(workspace.id, workspaceIds.splice(0)))
  }
  if (userIds.length > 0) {
    await db.delete(permissions).where(inArray(permissions.userId, userIds))
    await db.delete(user).where(inArray(user.id, userIds.splice(0)))
  }
})

describe('test sets', () => {
  it('stores rows in order and counts the annotated ones', async () => {
    const { userId, workspaceId } = await seedWorkspace()
    const dataset = await insertDataset({
      workspaceId,
      name: 'FAQ tarifs',
      description: 'Questions sur les prix',
      source: 'jsonl',
      createdBy: userId,
      rows: [
        draft('Q1'),
        draft('Q2', { candidate: 'R2', humanVerdict: 'pass', humanNote: 'Exact' }),
      ],
    })
    expect(dataset).toMatchObject({ rowCount: 2, annotatedCount: 1, source: 'jsonl' })
    const rows = await listRows(dataset.id, { limit: 10, offset: 0 })
    expect(rows.map((row) => [row.position, row.input, row.humanVerdict])).toEqual([
      [0, 'Q1', null],
      [1, 'Q2', 'pass'],
    ])
    expect((await listDatasets(workspaceId)).map((entry) => entry.name)).toEqual(['FAQ tarifs'])
  })

  it('refuses a second test set with the same name, whatever its case', async () => {
    const { userId, workspaceId } = await seedWorkspace()
    const base = { workspaceId, description: '', source: 'manual', createdBy: userId, rows: [] }
    await insertDataset({ ...base, name: 'FAQ tarifs' })
    expect(await codeOf(insertDataset({ ...base, name: 'faq TARIFS' }))).toBe('conflict')
  })

  it('never shows a test set to another workspace', async () => {
    const first = await seedWorkspace()
    const second = await seedWorkspace()
    const dataset = await insertDataset({
      workspaceId: first.workspaceId,
      name: 'Privé',
      description: '',
      source: 'manual',
      createdBy: first.userId,
      rows: [draft('Q')],
    })
    expect(await getDataset(second.workspaceId, dataset.id)).toBeNull()
    expect(await listDatasets(second.workspaceId)).toEqual([])
  })

  it('appends after the last position and stops at the ceiling', async () => {
    const { userId, workspaceId } = await seedWorkspace()
    const dataset = await insertDataset({
      workspaceId,
      name: 'Court',
      description: '',
      source: 'manual',
      createdBy: userId,
      rows: [draft('Q1'), draft('Q2')],
    })
    await appendRows(dataset.id, [draft('Q3')], { maxRows: 3 })
    const rows = await listRows(dataset.id, { limit: 10, offset: 0 })
    expect(rows.map((row) => row.position)).toEqual([0, 1, 2])
    expect(await codeOf(appendRows(dataset.id, [draft('Q4')], { maxRows: 3 }))).toBe('validation')
  })

  it('updates an annotation of a row', async () => {
    const { userId, workspaceId } = await seedWorkspace()
    const dataset = await insertDataset({
      workspaceId,
      name: 'Annot',
      description: '',
      source: 'manual',
      createdBy: userId,
      rows: [draft('Q1')],
    })
    const [row] = await listRows(dataset.id, { limit: 1, offset: 0 })
    await updateRow(dataset.id, row.id, {
      candidate: 'R',
      humanVerdict: 'fail',
      humanNote: 'Prix faux',
    })
    const [after] = await listRows(dataset.id, { limit: 1, offset: 0 })
    expect(after).toMatchObject({ candidate: 'R', humanVerdict: 'fail', humanNote: 'Prix faux' })
  })

  it('refuses to delete a test set a campaign uses, and deletes it once the campaign is gone', async () => {
    const { userId, workspaceId } = await seedWorkspace()
    const { dataset, campaign } = await seedCampaign(workspaceId, userId)
    expect(await codeOf(deleteDataset(workspaceId, dataset.id))).toBe('conflict')
    expect(await codeOf(deleteCampaign(workspaceId, campaign.id))).toBe('conflict')
    await cancelCampaign(workspaceId, campaign.id)
    expect((await deleteCampaign(workspaceId, campaign.id))?.id).toBe(campaign.id)
    expect((await deleteDataset(workspaceId, dataset.id))?.id).toBe(dataset.id)
  })
})

describe('campaigns', () => {
  it('creates one item per row and target, with its own copy of the row', async () => {
    const { userId, workspaceId } = await seedWorkspace()
    const { dataset, campaign } = await seedCampaign(workspaceId, userId, 3)
    expect(campaign).toMatchObject({ itemTotal: 6, status: 'pending' })
    const [row] = await listRows(dataset.id, { limit: 1, offset: 0 })
    await updateRow(dataset.id, row.id, { input: 'Question modifiée' })
    const items = await listItems(campaign.id, { answerPreview: 100 })
    expect(items).toHaveLength(6)
    expect(items.map((item) => item.targetKey)).toEqual(['t1', 't2', 't1', 't2', 't1', 't2'])
    expect(items[0].input).toBe('Question 0')
  })

  it('hides a campaign from another workspace', async () => {
    const first = await seedWorkspace()
    const second = await seedWorkspace()
    const { campaign } = await seedCampaign(first.workspaceId, first.userId)
    expect(await getCampaign(second.workspaceId, campaign.id)).toBeNull()
    expect(await listCampaigns(second.workspaceId, 50)).toEqual([])
  })

  it('never hands the same item to two workers', async () => {
    const { userId, workspaceId } = await seedWorkspace()
    const { campaign } = await seedCampaign(workspaceId, userId, 6)
    const now = new Date()
    const claimed = await Promise.all(
      Array.from({ length: 12 }, () => claimNextItem(campaign.id, now))
    )
    const ids = claimed.flatMap((item) => (item ? [item.id] : []))
    expect(ids).toHaveLength(12)
    expect(new Set(ids).size).toBe(12)
    expect(await claimNextItem(campaign.id, now)).toBeNull()
    expect(claimed.every((item) => item?.attempt === 1 && item.status === 'running')).toBe(true)
  })

  it('claims items in position order', async () => {
    const { userId, workspaceId } = await seedWorkspace()
    const { campaign } = await seedCampaign(workspaceId, userId, 2)
    const first = await claimNextItem(campaign.id, new Date())
    expect(first).toMatchObject({ input: 'Question 0', targetKey: 't1' })
    const second = await claimNextItem(campaign.id, new Date())
    expect(second).toMatchObject({ input: 'Question 0', targetKey: 't2' })
  })

  it('reports progress and the pass rate in the list', async () => {
    const { userId, workspaceId } = await seedWorkspace()
    const { campaign } = await seedCampaign(workspaceId, userId, 2)
    const now = new Date()
    const first = await claimNextItem(campaign.id, now)
    const second = await claimNextItem(campaign.id, now)
    if (!first || !second) throw new Error('expected two items')
    await completeItem(
      first.id,
      {
        answer: 'x',
        verdict: 'pass',
        score: null,
        judgeNote: 'ok',
        latencyMs: 10,
        inputTokens: 5,
        outputTokens: 2,
        kgCo2eq: null,
        executionId: null,
      },
      now
    )
    await completeItem(
      second.id,
      {
        answer: 'y',
        verdict: 'fail',
        score: null,
        judgeNote: 'non',
        latencyMs: 20,
        inputTokens: 5,
        outputTokens: 2,
        kgCo2eq: null,
        executionId: null,
      },
      now
    )
    const [listed] = await listCampaigns(workspaceId, 50)
    expect(listed.progress).toEqual({ finished: 2, passed: 1, errors: 0 })
  })
})

describe('leases and resumption', () => {
  const lease = (from: Date, ms = 60_000) => new Date(from.getTime() + ms)

  it('lets one process run a campaign at a time', async () => {
    const { userId, workspaceId } = await seedWorkspace()
    const { campaign } = await seedCampaign(workspaceId, userId)
    const now = new Date()
    const winner = await acquireCampaign(campaign.id, 'a', now, lease(now))
    const loser = await acquireCampaign(campaign.id, 'b', now, lease(now))
    expect(winner?.resumed).toBe(false)
    expect(loser).toBeNull()
    expect((await getCampaign(workspaceId, campaign.id))?.status).toBe('running')
  })

  it('adopts a campaign whose lease expired and puts its in-flight items back', async () => {
    const { userId, workspaceId } = await seedWorkspace()
    const { campaign } = await seedCampaign(workspaceId, userId, 2)
    const now = new Date()
    await acquireCampaign(campaign.id, 'dead-process', now, lease(now))
    const stuck = await claimNextItem(campaign.id, now)
    if (!stuck) throw new Error('expected an item')

    const later = new Date(now.getTime() + 5 * 60_000)
    expect(await listAdoptableCampaignIds(later)).toContain(campaign.id)
    const adopted = await acquireCampaign(campaign.id, 'new-process', later, lease(later))
    expect(adopted?.resumed).toBe(true)

    const again = await claimNextItem(campaign.id, later)
    expect(again?.id).toBe(stuck.id)
    expect(again?.attempt).toBe(2)
  })

  it('does not list a campaign whose lease is still valid', async () => {
    const { userId, workspaceId } = await seedWorkspace()
    const { campaign } = await seedCampaign(workspaceId, userId)
    const now = new Date()
    await acquireCampaign(campaign.id, 'a', now, lease(now))
    expect(await listAdoptableCampaignIds(now)).not.toContain(campaign.id)
  })

  it('gives up on an item that was interrupted three times', async () => {
    const { userId, workspaceId } = await seedWorkspace()
    const { campaign } = await seedCampaign(workspaceId, userId, 1)
    let clock = new Date()
    await acquireCampaign(campaign.id, 'p0', clock, lease(clock))
    for (let attempt = 1; attempt <= 3; attempt++) {
      const item = await claimNextItem(campaign.id, clock)
      expect(item?.attempt).toBe(attempt)
      clock = new Date(clock.getTime() + 5 * 60_000)
      await acquireCampaign(campaign.id, `p${attempt}`, clock, lease(clock))
    }
    const items = await listItems(campaign.id, { answerPreview: 0 })
    const first = items[0]
    expect(first).toMatchObject({ status: 'error' })
    expect(first.error).toMatch(/interrompu/i)
    expect(items[1].status).toBe('pending')
  })

  it('extends the lease only for its owner', async () => {
    const { userId, workspaceId } = await seedWorkspace()
    const { campaign } = await seedCampaign(workspaceId, userId)
    const now = new Date()
    await acquireCampaign(campaign.id, 'a', now, lease(now))
    expect(await heartbeat(campaign.id, 'a', lease(now, 120_000))).toBe(true)
    expect(await heartbeat(campaign.id, 'b', lease(now, 120_000))).toBe(false)
  })

  it('keeps a cancelled campaign cancelled, and cancels only an active one', async () => {
    const { userId, workspaceId } = await seedWorkspace()
    const { campaign } = await seedCampaign(workspaceId, userId)
    const now = new Date()
    await acquireCampaign(campaign.id, 'a', now, lease(now))
    expect((await cancelCampaign(workspaceId, campaign.id))?.status).toBe('cancelled')
    expect(await finishCampaign(campaign.id, 'a', 'completed')).toBe(false)
    expect((await getCampaign(workspaceId, campaign.id))?.status).toBe('cancelled')
    expect(await cancelCampaign(workspaceId, campaign.id)).toBeNull()
    expect(await heartbeat(campaign.id, 'a', lease(now))).toBe(false)
  })
})

describe('schedules', () => {
  it('starts a due schedule once, however many processes ask', async () => {
    const { userId, workspaceId } = await seedWorkspace()
    const { dataset, judge } = await seedCampaign(workspaceId, userId)
    const due = new Date('2026-11-01T02:00:00Z')
    await insertSchedule({
      workspaceId,
      name: 'Nuit',
      cron: '0 3 * * *',
      timezone: 'Europe/Paris',
      datasetId: dataset.id,
      judgeId: judge.id,
      targets,
      concurrency: 2,
      alertThreshold: 0.9,
      nextRunAt: due,
      createdBy: userId,
    })
    const next = new Date('2026-11-02T02:00:00Z')
    const ask = () => claimDueSchedules(new Date('2026-11-01T02:00:30Z'), () => next)
    const results = await Promise.all([ask(), ask(), ask()])
    const claimed = results.flat()
    expect(claimed).toHaveLength(1)
    expect(claimed[0].name).toBe('Nuit')
    expect(await ask()).toEqual([])
  })

  it('does not start a schedule before its time or once disabled', async () => {
    const { userId, workspaceId } = await seedWorkspace()
    const { dataset, judge } = await seedCampaign(workspaceId, userId)
    const base = {
      workspaceId,
      cron: '0 3 * * *',
      timezone: 'UTC',
      datasetId: dataset.id,
      judgeId: judge.id,
      targets,
      concurrency: 2,
      alertThreshold: null,
      createdBy: userId,
    }
    await insertSchedule({ ...base, name: 'Futur', nextRunAt: new Date('2026-11-05T03:00:00Z') })
    await insertSchedule({
      ...base,
      name: 'Éteinte',
      nextRunAt: new Date('2026-11-01T03:00:00Z'),
      enabled: false,
    })
    expect(await claimDueSchedules(new Date('2026-11-02T00:00:00Z'), () => null)).toEqual([])
  })
})

describe('alerts', () => {
  it('records an alert once per campaign, target and kind, and lets a member acknowledge it', async () => {
    const { userId, workspaceId } = await seedWorkspace()
    const { campaign } = await seedCampaign(workspaceId, userId)
    const alert = {
      workspaceId,
      campaignId: campaign.id,
      targetKey: 't1',
      targetLabel: 'Modèle A',
      kind: 'below_threshold' as const,
      passRate: 0.5,
      threshold: 0.8,
    }
    expect(await insertAlerts([alert])).toHaveLength(1)
    expect(await insertAlerts([alert])).toHaveLength(0)

    const [open] = await listAlerts(workspaceId, { open: true })
    expect(open).toMatchObject({ campaignName: 'Campagne', targetLabel: 'Modèle A', passRate: 0.5 })
    expect(await acknowledgeAlert(workspaceId, open.id, userId)).toBe(true)
    expect(await acknowledgeAlert(workspaceId, open.id, userId)).toBe(false)
    expect(await listAlerts(workspaceId, { open: true })).toEqual([])
    expect(await listAlerts(workspaceId, { open: false })).toHaveLength(1)
  })
})
