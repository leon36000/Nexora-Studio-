/**
 * Retention against real PostgreSQL: a trace exactly at the limit stays, one second older goes with
 * its spans, a simulated clock two days ahead empties a one-day retention, a workspace-scoped
 * purge leaves the others, batches delete everything, replays and concurrent purges are harmless,
 * and Assistant conversations are purged by their last message.
 */
import { db } from '@sim/db'
import {
  nexoraAssistantConversation,
  nexoraAssistantMessage,
  nexoraTrace,
  nexoraTraceSpan,
  permissions,
  user,
  workspace,
} from '@sim/db/schema'
import { deleteWorkspaceFixture, insertWorkspaceFixture } from '@sim/db/testing/workspace-fixtures'
import { generateId } from '@sim/utils/id'
import { generateRandomHex } from '@sim/utils/random'
import { eq, inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'
import { purgeConversations, purgeTraces, runScheduledPurge } from '@/lib/nexora/traces/purge'
import { DEFAULT_TRACE_SETTINGS } from '@/lib/nexora/traces/settings'

const userIds: string[] = []
const workspaceIds: string[] = []
const DAY = 86_400_000

async function seedWorkspace(): Promise<{ workspaceId: string; userId: string }> {
  const userId = generateId()
  userIds.push(userId)
  const now = new Date()
  await db.insert(user).values({
    id: userId,
    name: 'Purge fixture',
    email: `${userId}@purge.test`,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  })
  const workspaceId = generateId()
  workspaceIds.push(workspaceId)
  await insertWorkspaceFixture(db, {
    id: workspaceId,
    name: 'Purge fixture',
    ownerId: userId,
    billedAccountUserId: userId,
  })
  return { workspaceId, userId }
}

async function addTrace(workspaceId: string, startedAt: Date, withSpan = true): Promise<string> {
  const id = generateRandomHex(32)
  await db.insert(nexoraTrace).values({
    id,
    workspaceId,
    source: 'agent',
    name: 'trace',
    status: 'ok',
    startedAt,
    durationMs: 10,
  })
  if (withSpan) {
    await db.insert(nexoraTraceSpan).values({
      traceId: id,
      id: generateRandomHex(16),
      position: 0,
      kind: 'step',
      name: 'span',
      startedAt,
      durationMs: 10,
      status: 'ok',
    })
  }
  return id
}

async function remaining(workspaceId: string): Promise<string[]> {
  const rows = await db
    .select({ id: nexoraTrace.id })
    .from(nexoraTrace)
    .where(eq(nexoraTrace.workspaceId, workspaceId))
  return rows.map((row) => row.id)
}

afterAll(async () => {
  if (workspaceIds.length) await deleteWorkspaceFixture(db, inArray(workspace.id, workspaceIds))
  if (userIds.length) {
    await db.delete(permissions).where(inArray(permissions.userId, userIds))
    await db.delete(user).where(inArray(user.id, userIds))
  }
})

describe('purgeTraces', () => {
  it('garde la trace pile à la limite, supprime celle d’une seconde plus ancienne, avec ses spans', async () => {
    const { workspaceId } = await seedWorkspace()
    const now = new Date('2026-10-25T12:00:00.000Z')
    const atLimit = await addTrace(workspaceId, new Date(now.getTime() - 30 * DAY))
    const older = await addTrace(workspaceId, new Date(now.getTime() - 30 * DAY - 1000))
    const recent = await addTrace(workspaceId, new Date(now.getTime() - DAY))
    const result = await purgeTraces({ now, retentionDays: 30 })
    expect(result.deleted).toBeGreaterThanOrEqual(1)
    expect((await remaining(workspaceId)).sort()).toEqual([atLimit, recent].sort())
    expect(
      await db.select().from(nexoraTraceSpan).where(eq(nexoraTraceSpan.traceId, older))
    ).toHaveLength(0)
    expect(
      await db.select().from(nexoraTraceSpan).where(eq(nexoraTraceSpan.traceId, atLimit))
    ).toHaveLength(1)
  })

  it('avec 1 jour de rétention et une horloge avancée de 2 jours, supprime tout l’espace visé et rien ailleurs', async () => {
    const target = await seedWorkspace()
    const other = await seedWorkspace()
    const real = new Date()
    await addTrace(target.workspaceId, real)
    await addTrace(target.workspaceId, new Date(real.getTime() - 3600_000))
    const kept = await addTrace(other.workspaceId, real)
    const result = await purgeTraces({
      now: new Date(real.getTime() + 2 * DAY),
      retentionDays: 1,
      workspaceId: target.workspaceId,
    })
    expect(result.deleted).toBe(2)
    expect(await remaining(target.workspaceId)).toEqual([])
    expect(await remaining(other.workspaceId)).toEqual([kept])
  })

  it('supprime tout par lots, et rejouée ne supprime plus rien', async () => {
    const { workspaceId } = await seedWorkspace()
    const old = new Date('2020-01-01T00:00:00.000Z')
    for (let index = 0; index < 7; index++)
      await addTrace(workspaceId, new Date(old.getTime() + index * 1000))
    const first = await purgeTraces({
      now: new Date(),
      retentionDays: 30,
      workspaceId,
      batchSize: 2,
    })
    expect(first.deleted).toBe(7)
    expect(await remaining(workspaceId)).toEqual([])
    expect(
      (await purgeTraces({ now: new Date(), retentionDays: 30, workspaceId, batchSize: 2 })).deleted
    ).toBe(0)
  })

  it('deux purges simultanées ne se gênent pas : tout est supprimé, sans erreur', async () => {
    const { workspaceId } = await seedWorkspace()
    const old = new Date('2020-01-01T00:00:00.000Z')
    for (let index = 0; index < 9; index++)
      await addTrace(workspaceId, new Date(old.getTime() + index * 1000))
    const options = { now: new Date(), retentionDays: 30, workspaceId, batchSize: 2 }
    const results = await Promise.all([purgeTraces(options), purgeTraces(options)])
    expect(results.reduce((sum, result) => sum + result.deleted, 0)).toBeLessThanOrEqual(9)
    // A purge that found the other one working leaves its rows to it; a final pass settles it.
    await purgeTraces(options)
    expect(await remaining(workspaceId)).toEqual([])
  })
})

describe('purgeConversations', () => {
  async function addConversation(workspaceId: string, userId: string, updatedAt: Date) {
    const id = generateId()
    await db.insert(nexoraAssistantConversation).values({
      id,
      workspaceId,
      userId,
      title: 'Conversation',
      createdAt: updatedAt,
      updatedAt,
    })
    await db.insert(nexoraAssistantMessage).values({
      id: generateId(),
      conversationId: id,
      role: 'user',
      content: 'Bonjour',
      createdAt: updatedAt,
    })
    return id
  }

  it('supprime les conversations dont le dernier message dépasse la limite, avec leurs messages', async () => {
    const { workspaceId, userId } = await seedWorkspace()
    const now = new Date('2026-10-25T12:00:00.000Z')
    const stale = await addConversation(workspaceId, userId, new Date(now.getTime() - 91 * DAY))
    const fresh = await addConversation(workspaceId, userId, new Date(now.getTime() - 89 * DAY))
    await purgeConversations({ now, retentionDays: 90 })
    const left = await db
      .select({ id: nexoraAssistantConversation.id })
      .from(nexoraAssistantConversation)
      .where(eq(nexoraAssistantConversation.workspaceId, workspaceId))
    expect(left.map((row) => row.id)).toEqual([fresh])
    expect(
      await db
        .select()
        .from(nexoraAssistantMessage)
        .where(eq(nexoraAssistantMessage.conversationId, stale))
    ).toHaveLength(0)
  })
})

describe('runScheduledPurge', () => {
  it('applique la rétention des traces, et celle des conversations seulement si elle est réglée', async () => {
    const { workspaceId, userId } = await seedWorkspace()
    const now = new Date()
    await addTrace(workspaceId, new Date(now.getTime() - 40 * DAY))
    const conversation = generateId()
    await db.insert(nexoraAssistantConversation).values({
      id: conversation,
      workspaceId,
      userId,
      title: 'Ancienne',
      createdAt: new Date(now.getTime() - 400 * DAY),
      updatedAt: new Date(now.getTime() - 400 * DAY),
    })

    const withoutConversations = await runScheduledPurge(now, DEFAULT_TRACE_SETTINGS)
    expect(withoutConversations.deletedTraces).toBeGreaterThanOrEqual(1)
    expect(withoutConversations.deletedConversations).toBe(0)
    expect(
      await db
        .select()
        .from(nexoraAssistantConversation)
        .where(eq(nexoraAssistantConversation.id, conversation))
    ).toHaveLength(1)

    const withConversations = await runScheduledPurge(now, {
      ...DEFAULT_TRACE_SETTINGS,
      conversationRetentionDays: 365,
    })
    expect(withConversations.deletedConversations).toBeGreaterThanOrEqual(1)
    expect(
      await db
        .select()
        .from(nexoraAssistantConversation)
        .where(eq(nexoraAssistantConversation.id, conversation))
    ).toHaveLength(0)
  })

  it('applique quand même la rétention aux traces déjà stockées quand la capture est désactivée', async () => {
    const { workspaceId } = await seedWorkspace()
    const now = new Date()
    await addTrace(workspaceId, new Date(now.getTime() - 40 * DAY))
    const result = await runScheduledPurge(now, { ...DEFAULT_TRACE_SETTINGS, enabled: false })
    expect(result.deletedTraces).toBeGreaterThanOrEqual(1)
  })
})
