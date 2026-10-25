/**
 * Batches against real PostgreSQL: two workers never claim the same request, a batch whose lease
 * expired is adopted with its in-flight requests put back (and given up on after three tries), a
 * stale owner cannot end a batch, the files and batches of one workspace (or of the instance keys)
 * stay invisible to the others, ending a batch turns the open requests into errors and creates the
 * output and error files, results are paged in order, and old batches are purged.
 */
import { db } from '@sim/db'
import { nexoraBatch, nexoraBatchFile, permissions, user, workspace } from '@sim/db/schema'
import { deleteWorkspaceFixture, insertWorkspaceFixture } from '@sim/db/testing/workspace-fixtures'
import { generateId } from '@sim/utils/id'
import { eq, inArray } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'
import {
  acquireBatch,
  type BatchScope,
  claimNextItem,
  completeItem,
  countOpenItems,
  deleteBatch,
  deleteFile,
  failItem,
  finishBatch,
  getBatch,
  getFile,
  getFileText,
  getResultFileBatch,
  heartbeat,
  insertBatchWithItems,
  insertFile,
  listAdoptableBatchIds,
  listBatches,
  listResults,
  type NewItem,
  pendingLinesInScope,
  purgeBefore,
  releaseItem,
  requestCancel,
} from '@/lib/nexora/batches/repository'

const workspaceIds: string[] = []
const instanceBatchIds: string[] = []
const instanceFileIds: string[] = []

async function seedWorkspace(): Promise<{ scope: BatchScope; userId: string }> {
  const userId = generateId()
  const workspaceId = generateId()
  workspaceIds.push(workspaceId)
  const now = new Date()
  await db.insert(user).values({
    id: userId,
    name: 'Lots fixture',
    email: `${userId}@batches.test`,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  })
  await insertWorkspaceFixture(db, {
    id: workspaceId,
    name: 'Lots fixture',
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
  return { scope: { workspaceId }, userId }
}

afterEach(async () => {
  if (instanceBatchIds.length > 0) {
    await db.delete(nexoraBatch).where(inArray(nexoraBatch.id, instanceBatchIds.splice(0)))
  }
  if (instanceFileIds.length > 0) {
    await db.delete(nexoraBatchFile).where(inArray(nexoraBatchFile.id, instanceFileIds.splice(0)))
  }
  if (workspaceIds.length > 0) {
    await deleteWorkspaceFixture(db, inArray(workspace.id, workspaceIds.splice(0)))
  }
})

const items = (count: number): NewItem[] =>
  Array.from({ length: count }, (_, position) => ({
    position,
    customId: `req-${position}`,
    request: { model: 'm', messages: [{ role: 'user', content: `Question ${position}` }] },
  }))

async function seedBatch(scope: BatchScope, count = 3, overrides: { expiresAt?: Date } = {}) {
  return insertBatchWithItems(
    {
      scope,
      apiKeyId: null,
      createdBy: null,
      source: 'api',
      endpoint: '/v1/chat/completions',
      model: 'm',
      concurrency: 2,
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + 86_400_000),
    },
    items(count)
  )
}

const success = {
  response: { status_code: 200, request_id: 'req_x', body: { ok: true } },
  answer: 'ok',
  promptTokens: 10,
  completionTokens: 5,
  latencyMs: 12,
}

const t0 = new Date('2026-10-25T10:00:00Z')
const later = (seconds: number) => new Date(t0.getTime() + seconds * 1000)

describe('claiming requests', () => {
  it('hands each request to exactly one of twenty concurrent workers', async () => {
    const { scope } = await seedWorkspace()
    const batch = await seedBatch(scope, 8)
    const claims = await Promise.all(Array.from({ length: 20 }, () => claimNextItem(batch.id, t0)))
    const claimed = claims.filter((item) => item !== null)
    expect(claimed).toHaveLength(8)
    expect(new Set(claimed.map((item) => item?.id)).size).toBe(8)
  })

  it('serves requests in file order', async () => {
    const { scope } = await seedWorkspace()
    const batch = await seedBatch(scope, 3)
    const first = await claimNextItem(batch.id, t0)
    const second = await claimNextItem(batch.id, t0)
    expect([first?.customId, second?.customId]).toEqual(['req-0', 'req-1'])
  })

  it('counts answered and failed requests in the batch, once each', async () => {
    const { scope } = await seedWorkspace()
    const batch = await seedBatch(scope, 2)
    const first = await claimNextItem(batch.id, t0)
    const second = await claimNextItem(batch.id, t0)
    expect(await completeItem(first?.id ?? '', success, t0)).toBe(true)
    expect(await completeItem(first?.id ?? '', success, t0)).toBe(false)
    expect(
      await failItem(second?.id ?? '', { code: 'upstream_error', message: 'Panne.' }, null, 5, t0)
    ).toBe(true)
    const after = await getBatch(scope, batch.id)
    expect(after).toMatchObject({ completed: 1, failed: 1, promptTokens: 10, completionTokens: 5 })
  })

  it('puts a released request back without counting the try', async () => {
    const { scope } = await seedWorkspace()
    const batch = await seedBatch(scope, 1)
    const claimed = await claimNextItem(batch.id, t0)
    expect(claimed?.attempt).toBe(1)
    await releaseItem(claimed?.id ?? '')
    const again = await claimNextItem(batch.id, t0)
    expect(again?.id).toBe(claimed?.id)
    expect(again?.attempt).toBe(1)
  })
})

describe('leases and restarts', () => {
  it('lets one process run a batch at a time', async () => {
    const { scope } = await seedWorkspace()
    const batch = await seedBatch(scope)
    expect(await acquireBatch(batch.id, 'a', t0, later(90))).not.toBeNull()
    expect(await acquireBatch(batch.id, 'b', later(10), later(100))).toBeNull()
  })

  it('adopts a batch whose lease expired and puts its in-flight requests back', async () => {
    const { scope } = await seedWorkspace()
    const batch = await seedBatch(scope, 3)
    await acquireBatch(batch.id, 'a', t0, later(90))
    const inFlight = await claimNextItem(batch.id, t0)
    const done = await claimNextItem(batch.id, t0)
    await completeItem(done?.id ?? '', success, t0)

    const adopted = await acquireBatch(batch.id, 'b', later(200), later(290))
    expect(adopted?.resumed).toBe(true)
    const next = await claimNextItem(batch.id, later(200))
    expect(next?.id).toBe(inFlight?.id)
    expect(await countOpenItems(batch.id)).toBe(2)
    expect((await getBatch(scope, batch.id))?.completed).toBe(1)
  })

  it('gives up on a request that was interrupted three times', async () => {
    const { scope } = await seedWorkspace()
    const batch = await seedBatch(scope, 1)
    let clock = 0
    for (let round = 0; round < 3; round += 1) {
      await acquireBatch(batch.id, `p${round}`, later(clock), later(clock + 90))
      await claimNextItem(batch.id, later(clock))
      clock += 200
    }
    await acquireBatch(batch.id, 'p3', later(clock), later(clock + 90))
    expect(await claimNextItem(batch.id, later(clock))).toBeNull()
    const [result] = await listResults(batch.id, 'error', -1, 10)
    expect(result.error?.code).toBe('interrupted')
    expect((await getBatch(scope, batch.id))?.failed).toBe(1)
  })

  it('refuses to end a batch for a process that lost it', async () => {
    const { scope } = await seedWorkspace()
    const batch = await seedBatch(scope, 1)
    await acquireBatch(batch.id, 'a', t0, later(90))
    await acquireBatch(batch.id, 'b', later(200), later(290))
    expect(await finishBatch(batch.id, 'a', 'completed', later(210))).toBe(false)
    expect(await heartbeat(batch.id, 'a', later(300))).toBeNull()
    expect(await heartbeat(batch.id, 'b', later(300))).toBe('in_progress')
  })

  it('lists the batches nobody runs', async () => {
    const { scope } = await seedWorkspace()
    const fresh = await seedBatch(scope)
    const held = await seedBatch(scope)
    const stale = await seedBatch(scope)
    await acquireBatch(held.id, 'a', t0, later(500))
    await acquireBatch(stale.id, 'a', t0, later(60))
    const adoptable = await listAdoptableBatchIds(later(100))
    expect(adoptable).toContain(fresh.id)
    expect(adoptable).toContain(stale.id)
    expect(adoptable).not.toContain(held.id)
  })
})

describe('cancelling and ending', () => {
  it('turns the open requests into batch_cancelled errors and keeps the answered ones', async () => {
    const { scope } = await seedWorkspace()
    const batch = await seedBatch(scope, 3)
    await acquireBatch(batch.id, 'a', t0, later(90))
    const first = await claimNextItem(batch.id, t0)
    await completeItem(first?.id ?? '', success, t0)
    await claimNextItem(batch.id, t0)

    const cancelling = await requestCancel(scope, batch.id, later(5))
    expect(cancelling?.status).toBe('cancelling')
    expect(await heartbeat(batch.id, 'a', later(60))).toBe('cancelling')
    expect(await finishBatch(batch.id, 'a', 'cancelled', later(6))).toBe(true)

    const after = await getBatch(scope, batch.id)
    expect(after).toMatchObject({ status: 'cancelled', completed: 1, failed: 2 })
    const errors = await listResults(batch.id, 'error', -1, 10)
    expect(errors.map((entry) => entry.error?.code)).toEqual(['batch_cancelled', 'batch_cancelled'])
    expect(await countOpenItems(batch.id)).toBe(0)
  })

  it('does not cancel a batch that already ended', async () => {
    const { scope } = await seedWorkspace()
    const batch = await seedBatch(scope, 1)
    await acquireBatch(batch.id, 'a', t0, later(90))
    const claimed = await claimNextItem(batch.id, t0)
    await completeItem(claimed?.id ?? '', success, t0)
    await finishBatch(batch.id, 'a', 'completed', later(1))
    expect((await requestCancel(scope, batch.id, later(2)))?.status).toBe('completed')
  })

  it('creates an output file and an error file only when they have lines', async () => {
    const { scope } = await seedWorkspace()
    const batch = await seedBatch(scope, 2)
    await acquireBatch(batch.id, 'a', t0, later(90))
    const first = await claimNextItem(batch.id, t0)
    await completeItem(first?.id ?? '', success, t0)
    const second = await claimNextItem(batch.id, t0)
    await completeItem(second?.id ?? '', success, t0)
    await finishBatch(batch.id, 'a', 'completed', later(1))

    const ended = await getBatch(scope, batch.id)
    expect(ended?.status).toBe('completed')
    expect(ended?.outputFileId).not.toBeNull()
    expect(ended?.errorFileId).toBeNull()
    const route = await getResultFileBatch(scope, ended?.outputFileId ?? '')
    expect(route).toEqual({ batchId: batch.id, kind: 'output' })
    expect((await getFile(scope, ended?.outputFileId ?? ''))?.lineCount).toBe(2)
  })

  it('marks what is still open as expired', async () => {
    const { scope } = await seedWorkspace()
    const batch = await seedBatch(scope, 2)
    await acquireBatch(batch.id, 'a', t0, later(90))
    await finishBatch(batch.id, 'a', 'expired', later(1))
    expect((await getBatch(scope, batch.id))?.status).toBe('expired')
    const errors = await listResults(batch.id, 'error', -1, 10)
    expect(errors.map((entry) => entry.error?.code)).toEqual(['batch_expired', 'batch_expired'])
  })
})

describe('scopes', () => {
  it('hides the batches and files of another workspace', async () => {
    const mine = await seedWorkspace()
    const other = await seedWorkspace()
    const batch = await seedBatch(mine.scope)
    const file = await insertFile({
      scope: mine.scope,
      apiKeyId: null,
      filename: 'a.jsonl',
      text: '{}',
      lineCount: 1,
    })
    expect(await getBatch(other.scope, batch.id)).toBeNull()
    expect(await getFile(other.scope, file.id)).toBeNull()
    expect(await getFileText(other.scope, file.id)).toBeNull()
    expect(await requestCancel(other.scope, batch.id, t0)).toBeNull()
    expect((await listBatches(other.scope, { limit: 10 })).batches).toEqual([])
    expect(await deleteFile(other.scope, file.id)).toBe(false)
  })

  it('keeps the batches of instance keys apart from every workspace', async () => {
    const mine = await seedWorkspace()
    const instance: BatchScope = { workspaceId: null }
    const batch = await seedBatch(instance, 2)
    instanceBatchIds.push(batch.id)
    const file = await insertFile({
      scope: instance,
      apiKeyId: null,
      filename: 'i.jsonl',
      text: '{}',
      lineCount: 1,
    })
    instanceFileIds.push(file.id)
    expect(await getBatch(mine.scope, batch.id)).toBeNull()
    expect(await getFile(mine.scope, file.id)).toBeNull()
    expect((await getBatch(instance, batch.id))?.id).toBe(batch.id)
    expect((await getFile(instance, file.id))?.id).toBe(file.id)
  })

  it('counts the requests waiting in the open batches of a scope only', async () => {
    const mine = await seedWorkspace()
    const other = await seedWorkspace()
    const open = await seedBatch(mine.scope, 5)
    await seedBatch(other.scope, 7)
    const ended = await seedBatch(mine.scope, 4)
    await acquireBatch(ended.id, 'a', t0, later(90))
    await finishBatch(ended.id, 'a', 'cancelled', later(1))
    const claimed = await claimNextItem(open.id, t0)
    await completeItem(claimed?.id ?? '', success, t0)
    expect(await pendingLinesInScope(mine.scope)).toBe(4)
    expect(await pendingLinesInScope(other.scope)).toBe(7)
  })

  it('hides a deleted file and forgets its text', async () => {
    const { scope } = await seedWorkspace()
    const file = await insertFile({
      scope,
      apiKeyId: null,
      filename: 'a.jsonl',
      text: 'secret',
      lineCount: 1,
    })
    expect(await deleteFile(scope, file.id)).toBe(true)
    expect(await getFile(scope, file.id)).toBeNull()
    expect(await getFileText(scope, file.id)).toBeNull()
    const [row] = await db.select().from(nexoraBatchFile).where(eq(nexoraBatchFile.id, file.id))
    expect(row.content).toBeNull()
  })
})

describe('listing', () => {
  it('pages results in file order and filters answered from failed', async () => {
    const { scope } = await seedWorkspace()
    const batch = await seedBatch(scope, 5)
    await acquireBatch(batch.id, 'a', t0, later(90))
    for (let index = 0; index < 5; index += 1) {
      const claimed = await claimNextItem(batch.id, t0)
      if (index === 3) {
        await failItem(claimed?.id ?? '', { code: 'x', message: 'y' }, null, 1, t0)
      } else {
        await completeItem(claimed?.id ?? '', success, t0)
      }
    }
    const firstPage = await listResults(batch.id, 'output', -1, 2)
    expect(firstPage.map((entry) => entry.customId)).toEqual(['req-0', 'req-1'])
    const secondPage = await listResults(batch.id, 'output', firstPage[1].position, 10)
    expect(secondPage.map((entry) => entry.customId)).toEqual(['req-2', 'req-4'])
    expect((await listResults(batch.id, 'error', -1, 10)).map((entry) => entry.customId)).toEqual([
      'req-3',
    ])
  })

  it('lists batches newest first with a cursor', async () => {
    const { scope } = await seedWorkspace()
    const first = await seedBatch(scope, 1)
    const second = await seedBatch(scope, 1)
    const page = await listBatches(scope, { limit: 1 })
    expect(page.batches[0].id).toBe(second.id)
    expect(page.hasMore).toBe(true)
    const next = await listBatches(scope, { limit: 1, after: second.id })
    expect(next.batches[0].id).toBe(first.id)
    expect(next.hasMore).toBe(false)
  })
})

describe('retention', () => {
  it('purges ended batches and old files, never an open batch', async () => {
    const { scope } = await seedWorkspace()
    const open = await seedBatch(scope, 1)
    const ended = await seedBatch(scope, 1)
    await acquireBatch(ended.id, 'a', t0, later(90))
    await finishBatch(ended.id, 'a', 'cancelled', t0)
    const purged = await purgeBefore(new Date(t0.getTime() + 1000))
    expect(purged.batches).toBeGreaterThanOrEqual(1)
    expect(await getBatch(scope, ended.id)).toBeNull()
    expect(await getBatch(scope, open.id)).not.toBeNull()
  })

  it('deletes an ended batch for its owner, never an open one', async () => {
    const { scope } = await seedWorkspace()
    const open = await seedBatch(scope, 1)
    expect(await deleteBatch(scope, open.id)).toBe(false)
    await acquireBatch(open.id, 'a', t0, later(90))
    await finishBatch(open.id, 'a', 'cancelled', t0)
    expect(await deleteBatch(scope, open.id)).toBe(true)
  })

  it('removes a workspace batch with its workspace', async () => {
    const { scope } = await seedWorkspace()
    const batch = await seedBatch(scope, 2)
    await db.delete(workspace).where(eq(workspace.id, scope.workspaceId ?? ''))
    expect(await getBatch(scope, batch.id)).toBeNull()
  })
})
