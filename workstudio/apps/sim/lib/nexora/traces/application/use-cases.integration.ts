/**
 * Who reads which trace, through the real use cases and real permissions: a member never reads
 * another member's private trace (detail, list, facets), a workspace administrator reads all of
 * their workspace, nobody reads another workspace's, and a refusal looks exactly like a missing
 * trace.
 */
import { db } from '@sim/db'
import { nexoraTrace, permissions, user, workspace } from '@sim/db/schema'
import { deleteWorkspaceFixture, insertWorkspaceFixture } from '@sim/db/testing/workspace-fixtures'
import { createSessionPrincipal } from '@sim/testing/factories/principal.factory'
import { auditMock } from '@sim/testing/mocks/audit.mock'
import { generateId } from '@sim/utils/id'
import { generateRandomHex } from '@sim/utils/random'
import { inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it, vi } from 'vitest'

vi.mock('@sim/audit', () => auditMock)
vi.mock('@/lib/mcp/pubsub', () => ({ mcpPubSub: null }))
vi.mock('@/lib/mcp/service', () => ({
  mcpService: { clearCache: vi.fn().mockResolvedValue(undefined) },
}))
vi.mock('@/lib/nexora/connect', () => ({
  forgetWorkspaceInConnect: vi.fn().mockResolvedValue(undefined),
}))

import {
  getWorkspaceTrace,
  listWorkspaceTraceFacets,
  listWorkspaceTraces,
} from '@/lib/nexora/traces/application/use-cases'

const userIds: string[] = []
const workspaceIds: string[] = []

async function seedUser(label: string): Promise<string> {
  const id = generateId()
  userIds.push(id)
  const now = new Date()
  await db.insert(user).values({
    id,
    name: label,
    email: `${id}@trace-access.test`,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  })
  return id
}

async function seedWorkspace(ownerId: string): Promise<string> {
  const id = generateId()
  workspaceIds.push(id)
  await insertWorkspaceFixture(db, {
    id,
    name: 'Accès aux traces',
    ownerId,
    billedAccountUserId: ownerId,
  })
  return id
}

async function grant(
  userId: string,
  workspaceId: string,
  permissionType: 'read' | 'write' | 'admin'
) {
  await db.insert(permissions).values({
    id: generateId(),
    userId,
    entityType: 'workspace',
    entityId: workspaceId,
    permissionType,
  })
}

async function addTrace(workspaceId: string, over: Partial<typeof nexoraTrace.$inferInsert>) {
  const id = generateRandomHex(32)
  await db.insert(nexoraTrace).values({
    id,
    workspaceId,
    source: 'agent',
    name: 'trace',
    status: 'ok',
    startedAt: new Date(),
    durationMs: 100,
    ...over,
  })
  return id
}

afterAll(async () => {
  if (workspaceIds.length) await deleteWorkspaceFixture(db, inArray(workspace.id, workspaceIds))
  if (userIds.length) {
    await db.delete(permissions).where(inArray(permissions.userId, userIds))
    await db.delete(user).where(inArray(user.id, userIds))
  }
})

async function world() {
  const owner = await seedUser('propriétaire')
  const alice = await seedUser('Alice')
  const bob = await seedUser('Bob')
  const reader = await seedUser('Lecteur')
  const admin = await seedUser('Admin')
  const outsider = await seedUser('Extérieur')
  const workspaceId = await seedWorkspace(owner)
  const otherWorkspaceId = await seedWorkspace(owner)
  await grant(alice, workspaceId, 'write')
  await grant(bob, workspaceId, 'write')
  await grant(reader, workspaceId, 'read')
  await grant(admin, workspaceId, 'admin')
  await grant(outsider, otherWorkspaceId, 'admin')
  const shared = await addTrace(workspaceId, { name: 'partagée', userId: alice })
  const privateOfAlice = await addTrace(workspaceId, {
    name: 'privée d’Alice',
    userId: alice,
    visibility: 'private',
    source: 'assistant',
    agentId: 'wf-alice',
    agentName: 'Agent privé',
    searchText: 'dossier confidentiel',
  })
  const elsewhere = await addTrace(otherWorkspaceId, { name: 'ailleurs' })
  return {
    workspaceId,
    otherWorkspaceId,
    alice,
    bob,
    reader,
    admin,
    outsider,
    shared,
    privateOfAlice,
    elsewhere,
  }
}

const filters = { limit: 50 }
const as = (userId: string) => createSessionPrincipal({ userId })

describe('listWorkspaceTraces', () => {
  it('chaque lecteur ne voit que ce qui lui revient', async () => {
    const w = await world()
    const names = async (userId: string) =>
      (
        await listWorkspaceTraces.execute({
          principal: as(userId),
          input: { workspaceId: w.workspaceId, filters },
        })
      ).traces
        .map((t) => t.name)
        .sort()
    expect(await names(w.alice)).toEqual(['partagée', 'privée d’Alice'])
    expect(await names(w.admin)).toEqual(['partagée', 'privée d’Alice'])
    expect(await names(w.bob)).toEqual(['partagée'])
    expect(await names(w.reader)).toEqual(['partagée'])
  })

  it('une recherche de texte ne retrouve pas le contenu privé d’un autre membre', async () => {
    const w = await world()
    const search = async (userId: string) =>
      (
        await listWorkspaceTraces.execute({
          principal: as(userId),
          input: { workspaceId: w.workspaceId, filters: { ...filters, q: 'confidentiel' } },
        })
      ).traces.length
    expect(await search(w.bob)).toBe(0)
    expect(await search(w.alice)).toBe(1)
    expect(await search(w.admin)).toBe(1)
  })

  it('refuse un non-membre de l’espace', async () => {
    const w = await world()
    await expect(
      listWorkspaceTraces.execute({
        principal: as(w.outsider),
        input: { workspaceId: w.workspaceId, filters },
      })
    ).rejects.toMatchObject({ code: expect.stringMatching(/forbidden|not_found/) })
  })
})

describe('getWorkspaceTrace', () => {
  const detail = (userId: string, workspaceId: string, traceId: string) =>
    getWorkspaceTrace.execute({ principal: as(userId), input: { workspaceId, traceId } })

  it('lit une trace partagée avec ses spans, en lecture seule comprise', async () => {
    const w = await world()
    const read = await detail(w.reader, w.workspaceId, w.shared)
    expect(read.trace.name).toBe('partagée')
  })

  it('répond « introuvable » pour la trace privée d’un autre membre, comme pour une trace absente', async () => {
    const w = await world()
    const refused = await detail(w.bob, w.workspaceId, w.privateOfAlice).catch((error) => error)
    const missing = await detail(w.bob, w.workspaceId, generateRandomHex(32)).catch(
      (error) => error
    )
    expect(refused).toMatchObject({ code: 'not_found' })
    expect(refused.message).toBe(missing.message)
  })

  it('lit sa propre trace privée, et l’administrateur de l’espace lit celle d’un membre', async () => {
    const w = await world()
    expect((await detail(w.alice, w.workspaceId, w.privateOfAlice)).trace.id).toBe(w.privateOfAlice)
    expect((await detail(w.admin, w.workspaceId, w.privateOfAlice)).trace.id).toBe(w.privateOfAlice)
  })

  it('ne livre jamais la trace d’un autre espace, même à son administrateur ou par l’identifiant', async () => {
    const w = await world()
    await expect(detail(w.admin, w.workspaceId, w.elsewhere)).rejects.toMatchObject({
      code: 'not_found',
    })
    await expect(detail(w.outsider, w.otherWorkspaceId, w.shared)).rejects.toMatchObject({
      code: 'not_found',
    })
  })
})

describe('listWorkspaceTraceFacets', () => {
  it('n’offre pas les agents, modèles ou sources des traces privées d’un autre membre', async () => {
    const w = await world()
    const facets = (userId: string) =>
      listWorkspaceTraceFacets.execute({
        principal: as(userId),
        input: { workspaceId: w.workspaceId },
      })
    expect((await facets(w.bob)).agents.map((agent) => agent.id)).not.toContain('wf-alice')
    expect((await facets(w.bob)).sources).not.toContain('assistant')
    expect((await facets(w.admin)).agents.map((agent) => agent.id)).toContain('wf-alice')
  })
})
