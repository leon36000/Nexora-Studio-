/**
 * Developer API keys against real PostgreSQL: a deleted workspace's keys stop working, a monthly
 * cap holds under concurrent calls (reservation under the key's row lock), a reservation is
 * reconciled with what the call really used, and revoking twice changes nothing.
 */
import { db } from '@sim/db'
import { nexoraApiKey, nexoraApiKeyUsage, permissions, user, workspace } from '@sim/db/schema'
import { readTestDatabaseUrl } from '@sim/db/testing/test-infrastructure'
import { deleteWorkspaceFixture, insertWorkspaceFixture } from '@sim/db/testing/workspace-fixtures'
import { createSessionPrincipal } from '@sim/testing/factories/principal.factory'
import { auditMock, auditMockFns } from '@sim/testing/mocks/audit.mock'
import { sleep } from '@sim/utils/helpers'
import { generateId } from '@sim/utils/id'
import { eq, inArray } from 'drizzle-orm'
import postgres from 'postgres'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@sim/audit', () => auditMock)
vi.mock('@/lib/mcp/pubsub', () => ({ mcpPubSub: null }))
vi.mock('@/lib/mcp/service', () => ({
  mcpService: { clearCache: vi.fn().mockResolvedValue(undefined) },
}))
vi.mock('@/lib/nexora/connect', () => ({
  forgetWorkspaceInConnect: vi.fn().mockResolvedValue(undefined),
}))

import { revokeWorkspaceNexoraApiKey } from '@/lib/nexora/developer-api/application/use-cases'
import { keyStatus } from '@/lib/nexora/developer-api/policy'
import {
  findNexoraApiKeyByHash,
  hashNexoraApiKey,
  insertNexoraApiKey,
  listNexoraApiKeys,
  reserveNexoraApiKeyTokens,
  revokeNexoraApiKey,
  settleNexoraApiKeyTokens,
} from '@/lib/nexora/developer-api/repository'
import { archiveWorkspace } from '@/lib/workspaces/lifecycle'

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
    name: 'Developer API fixture',
    email: `${userId}@developer-api.test`,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  })
  await insertWorkspaceFixture(db, {
    id: workspaceId,
    name: 'Developer API fixture',
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

async function createKey(monthlyTokenCap: number | null = null) {
  const { userId, workspaceId } = await seedWorkspace()
  const { id, value } = await insertNexoraApiKey({
    scope: 'workspace',
    workspaceId,
    createdBy: userId,
    settings: {
      name: 'Fixture key',
      expiresAt: null,
      allowedModels: null,
      allowAgents: true,
      monthlyTokenCap,
      requestsPerMinute: 60,
    },
  })
  return { userId, workspaceId, keyId: id, value }
}

async function monthTokens(keyId: string) {
  const [listed] = (await listNexoraApiKeys('workspace', await workspaceOf(keyId))).filter(
    (key) => key.id === keyId
  )
  return listed.usage
}

async function workspaceOf(keyId: string): Promise<string> {
  const [row] = await db
    .select({ workspaceId: nexoraApiKey.workspaceId })
    .from(nexoraApiKey)
    .where(eq(nexoraApiKey.id, keyId))
  return row?.workspaceId ?? ''
}

afterEach(async () => {
  if (workspaceIds.length > 0) {
    await db.delete(nexoraApiKey).where(inArray(nexoraApiKey.workspaceId, workspaceIds))
    await deleteWorkspaceFixture(db, inArray(workspace.id, workspaceIds.splice(0)))
  }
  if (userIds.length > 0) {
    await db.delete(permissions).where(inArray(permissions.userId, userIds))
    await db.delete(user).where(inArray(user.id, userIds.splice(0)))
  }
})

describe('developer API keys of a deleted workspace', () => {
  it('are revoked by the workspace archive', async () => {
    const { workspaceId, keyId, value } = await createKey()

    await archiveWorkspace(workspaceId, { requestId: 'developer-api-archive' })

    const [row] = await db
      .select({ revokedAt: nexoraApiKey.revokedAt })
      .from(nexoraApiKey)
      .where(eq(nexoraApiKey.id, keyId))
    expect(row?.revokedAt).not.toBeNull()
    const key = await findNexoraApiKeyByHash(hashNexoraApiKey(value))
    expect(key && keyStatus(key, new Date())).toBe('revoked')
  })

  it('are refused even when the archive did not revoke them', async () => {
    const { workspaceId, value } = await createKey()
    await db.update(workspace).set({ archivedAt: new Date() }).where(eq(workspace.id, workspaceId))

    const key = await findNexoraApiKeyByHash(hashNexoraApiKey(value))

    expect(key && keyStatus(key, new Date())).toBe('revoked')
  })
})

describe('monthly cap reservations', () => {
  it('admit only one of several concurrent calls that each fit alone but not together', async () => {
    const { keyId } = await createKey(100)
    const first = await reserveNexoraApiKeyTokens({
      keyId,
      model: 'nexora-default',
      tokens: 90,
      monthlyTokenCap: 100,
    })
    expect(first.admitted).toBe(true)

    // Holding the usage row lines the calls up after their reads, where a race would let all in.
    const holder = postgres(readTestDatabaseUrl(), { max: 1, onnotice: () => undefined })
    const pending: { calls?: Promise<Awaited<ReturnType<typeof reserveNexoraApiKeyTokens>>[]> } = {}
    try {
      await holder.begin(async (tx) => {
        await tx`SELECT key_id FROM nexora_api_key_usage WHERE key_id = ${keyId} FOR UPDATE`
        pending.calls = Promise.all(
          [0, 1, 2, 3].map(() =>
            reserveNexoraApiKeyTokens({
              keyId,
              model: 'nexora-default',
              tokens: 50,
              monthlyTokenCap: 100,
            })
          )
        )
        for (let attempt = 0; attempt < 100; attempt++) {
          const [{ waiting }] = await tx<{ waiting: number }[]>`
            SELECT count(*)::int AS waiting FROM pg_stat_activity
            WHERE wait_event_type = 'Lock' AND datname = current_database()`
          if (waiting >= 4) break
          await sleep(50)
        }
      })
    } finally {
      await holder.end()
    }
    const racing = (await pending.calls) ?? []

    expect(racing.filter((outcome) => outcome.admitted)).toHaveLength(1)
  })

  it('refuses a call once the reservations reach the cap', async () => {
    const { keyId } = await createKey(100)
    await reserveNexoraApiKeyTokens({ keyId, model: 'm', tokens: 100, monthlyTokenCap: 100 })

    const refused = await reserveNexoraApiKeyTokens({
      keyId,
      model: 'm',
      tokens: 1,
      monthlyTokenCap: 100,
    })

    expect(refused).toMatchObject({ admitted: false, monthTokens: 100 })
  })

  it('replaces the estimate with what the call used', async () => {
    const { keyId } = await createKey(1_000)
    const reservation = await reserveNexoraApiKeyTokens({
      keyId,
      model: 'm',
      tokens: 500,
      monthlyTokenCap: 1_000,
    })
    if (!reservation.admitted) throw new Error('reservation refused')

    await settleNexoraApiKeyTokens({
      ...reservation.handle,
      promptTokens: 30,
      completionTokens: 12,
    })

    expect(await monthTokens(keyId)).toMatchObject({ requests: 1, totalTokens: 42 })
  })

  it('leaves no trace of a call released without being made', async () => {
    const { keyId } = await createKey(1_000)
    const reservation = await reserveNexoraApiKeyTokens({
      keyId,
      model: 'm',
      tokens: 500,
      monthlyTokenCap: 1_000,
    })
    if (!reservation.admitted) throw new Error('reservation refused')

    await settleNexoraApiKeyTokens({ ...reservation.handle, released: true })

    expect(await monthTokens(keyId)).toMatchObject({ requests: 0, totalTokens: 0 })
    const rows = await db
      .select({ promptTokens: nexoraApiKeyUsage.promptTokens })
      .from(nexoraApiKeyUsage)
      .where(eq(nexoraApiKeyUsage.keyId, keyId))
    expect(rows.every((row) => row.promptTokens === 0)).toBe(true)
  })
})

describe('revoking a key', () => {
  it('reports a second revocation as already done', async () => {
    const { userId, workspaceId, keyId } = await createKey()
    const input = { keyId, scope: 'workspace' as const, workspaceId, revokedBy: userId }

    const first = await revokeNexoraApiKey(input)
    const second = await revokeNexoraApiKey(input)

    expect(first).toMatchObject({ id: keyId, alreadyRevoked: false })
    expect(second).toMatchObject({ id: keyId, alreadyRevoked: true })
  })
})

describe('revoking a key from Réglages › Clés API', () => {
  it('records one revocation in the audit log, however many times it is asked', async () => {
    const { userId, workspaceId, keyId } = await createKey()
    const principal = createSessionPrincipal({ userId })

    await revokeWorkspaceNexoraApiKey.execute({ principal, input: { workspaceId, keyId } })
    await revokeWorkspaceNexoraApiKey.execute({ principal, input: { workspaceId, keyId } })

    const revocations = auditMockFns.mockRecordAudit.mock.calls.filter(
      ([entry]) => entry.action === 'api_key.revoked' && entry.resourceId === keyId
    )
    expect(revocations).toHaveLength(1)
  })
})
