/**
 * Traces against real PostgreSQL: a trace replayed for the same execution is written once, every
 * filter of the Traces screen answers from the indexes, pages never repeat or skip a trace even
 * when several share a start time, and private traces stay out of every read of another member
 * (list, text search, facets).
 */
import { db } from '@sim/db'
import {
  nexoraApiKey,
  nexoraTrace,
  nexoraTraceSpan,
  permissions,
  user,
  workspace,
} from '@sim/db/schema'
import { deleteWorkspaceFixture, insertWorkspaceFixture } from '@sim/db/testing/workspace-fixtures'
import { generateId } from '@sim/utils/id'
import { generateRandomHex } from '@sim/utils/random'
import { eq, inArray, sql } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'
import {
  getTraceWithSpans,
  insertTrace,
  listFacets,
  listTraces,
} from '@/lib/nexora/traces/repository'
import type { StoredTrace } from '@/lib/nexora/traces/stored'

const userIds: string[] = []
const workspaceIds: string[] = []
const keyIds: string[] = []

async function seedUser(label: string): Promise<string> {
  const id = generateId()
  userIds.push(id)
  const now = new Date()
  await db.insert(user).values({
    id,
    name: label,
    email: `${id}@traces.test`,
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
    name: 'Traces fixture',
    ownerId,
    billedAccountUserId: ownerId,
  })
  return id
}

function stored(over: Partial<StoredTrace['trace']> & { id?: string } = {}): StoredTrace {
  const id = over.id ?? generateRandomHex(32)
  const startedAt = over.startedAt ?? new Date('2026-10-25T10:00:00.000Z')
  return {
    trace: {
      id,
      source: 'agent',
      visibility: 'workspace',
      name: 'Agent de test',
      status: 'ok',
      startedAt,
      durationMs: 500,
      models: ['nexora-default'],
      model: 'nexora-default',
      ...over,
    },
    spans: [
      {
        traceId: id,
        id: generateRandomHex(16),
        parentId: null,
        position: 0,
        kind: 'step',
        name: 'Agent de test',
        startedAt,
        durationMs: 500,
        status: 'ok',
        attributes: {},
      },
      {
        traceId: id,
        id: generateRandomHex(16),
        parentId: null,
        position: 1,
        kind: 'model',
        name: 'nexora-default',
        model: 'nexora-default',
        startedAt,
        durationMs: 400,
        status: 'ok',
        attributes: { finishReason: 'stop' },
      },
    ],
  }
}

afterAll(async () => {
  if (keyIds.length) await db.delete(nexoraApiKey).where(inArray(nexoraApiKey.id, keyIds))
  if (workspaceIds.length) {
    await deleteWorkspaceFixture(db, inArray(workspace.id, workspaceIds))
  }
  if (userIds.length) {
    await db.delete(permissions).where(inArray(permissions.userId, userIds))
    await db.delete(user).where(inArray(user.id, userIds))
  }
})

const admin = (userId: string) => ({ userId, seesPrivate: true })
const member = (userId: string) => ({ userId, seesPrivate: false })

describe('insertTrace', () => {
  it('écrit une trace et ses spans, et ne double rien quand l’exécution est rejouée', async () => {
    const owner = await seedUser('propriétaire')
    const workspaceId = await seedWorkspace(owner)
    const replayId = `exec-${generateId()}`
    const first = stored({ workspaceId, executionId: replayId })
    const replay = stored({ workspaceId, executionId: replayId })
    expect(await insertTrace(first)).toBe(true)
    expect(await insertTrace(replay)).toBe(false)
    const rows = await db.select().from(nexoraTrace).where(eq(nexoraTrace.workspaceId, workspaceId))
    expect(rows).toHaveLength(1)
    const spans = await db
      .select()
      .from(nexoraTraceSpan)
      .where(eq(nexoraTraceSpan.traceId, first.trace.id))
    expect(spans).toHaveLength(2)
    expect(
      await db.select().from(nexoraTraceSpan).where(eq(nexoraTraceSpan.traceId, replay.trace.id))
    ).toHaveLength(0)
  })

  it('rend les spans dans l’ordre de l’arbre et supprime tout avec la trace', async () => {
    const owner = await seedUser('propriétaire')
    const workspaceId = await seedWorkspace(owner)
    const trace = stored({ workspaceId })
    await insertTrace(trace)
    const read = await getTraceWithSpans(trace.trace.id)
    expect(read?.spans.map((span) => span.position)).toEqual([0, 1])
    expect(read?.spans[1].attributes).toEqual({ finishReason: 'stop' })
    await db.delete(nexoraTrace).where(eq(nexoraTrace.id, trace.trace.id))
    expect(
      await db.select().from(nexoraTraceSpan).where(eq(nexoraTraceSpan.traceId, trace.trace.id))
    ).toHaveLength(0)
  })

  it('une trace qui échoue au milieu n’en laisse aucune trace', async () => {
    const owner = await seedUser('propriétaire')
    const workspaceId = await seedWorkspace(owner)
    const trace = stored({ workspaceId })
    trace.spans[1] = { ...trace.spans[1], id: trace.spans[0].id }
    await expect(insertTrace(trace)).rejects.toThrow()
    expect(
      await db.select().from(nexoraTrace).where(eq(nexoraTrace.id, trace.trace.id))
    ).toHaveLength(0)
  })
})

describe('listTraces — filtres', () => {
  it('combine espace, statut, modèle, agent, clé, durée, période et texte', async () => {
    const owner = await seedUser('propriétaire')
    const workspaceId = await seedWorkspace(owner)
    const keyId = generateId()
    keyIds.push(keyId)
    await db.insert(nexoraApiKey).values({
      id: keyId,
      name: 'Clé de test',
      scope: 'workspace',
      workspaceId,
      createdBy: owner,
      keyHash: generateRandomHex(64),
      keySuffix: 'abcd',
    })
    const day = (d: number) => new Date(Date.UTC(2026, 9, d, 12))
    await insertTrace(
      stored({
        workspaceId,
        name: 'lente',
        durationMs: 12_000,
        startedAt: day(20),
        searchText: 'Facture de la société Durand',
      })
    )
    await insertTrace(stored({ workspaceId, name: 'rapide', durationMs: 800, startedAt: day(21) }))
    await insertTrace(
      stored({ workspaceId, name: 'en erreur', status: 'error', startedAt: day(22) })
    )
    await insertTrace(
      stored({
        workspaceId,
        name: 'autre modèle',
        models: ['qwen2.5:7b'],
        model: 'qwen2.5:7b',
        startedAt: day(23),
      })
    )
    await insertTrace(
      stored({
        workspaceId,
        name: 'agent b',
        agentId: 'wf-b',
        agentName: 'Agent B',
        startedAt: day(24),
      })
    )
    await insertTrace(
      stored({
        workspaceId,
        name: 'par clé',
        source: 'api_key',
        apiKeyId: keyId,
        startedAt: day(25),
      })
    )
    const names = async (filters: Partial<Parameters<typeof listTraces>[0]> = {}) =>
      (await listTraces({ workspaceId, limit: 50, ...filters }, admin(owner))).traces
        .map((t) => t.name)
        .sort()

    expect(await names()).toHaveLength(6)
    expect(await names({ minDurationMs: 10_000 })).toEqual(['lente'])
    expect(await names({ maxDurationMs: 1000 })).toEqual(expect.arrayContaining(['rapide']))
    expect(await names({ maxDurationMs: 1000 })).not.toContain('lente')
    expect(await names({ status: 'error' })).toEqual(['en erreur'])
    expect(await names({ model: 'qwen2.5:7b' })).toEqual(['autre modèle'])
    expect(await names({ agentId: 'wf-b' })).toEqual(['agent b'])
    expect(await names({ apiKeyId: keyId })).toEqual(['par clé'])
    expect(await names({ source: 'api_key' })).toEqual(['par clé'])
    expect(await names({ from: day(22), to: day(24) })).toEqual([
      'agent b',
      'autre modèle',
      'en erreur',
    ])
    expect(await names({ q: 'durand' })).toEqual(['lente'])
    expect(await names({ q: 'durand', status: 'error' })).toEqual([])
  })

  it('traite % et _ du texte cherché comme des caractères, pas comme des jokers', async () => {
    const owner = await seedUser('propriétaire')
    const workspaceId = await seedWorkspace(owner)
    await insertTrace(
      stored({ workspaceId, name: 'remise', searchText: 'remise de 100% accordée' })
    )
    await insertTrace(stored({ workspaceId, name: 'autre', searchText: 'autre sujet' }))
    const search = async (q: string) =>
      (await listTraces({ workspaceId, limit: 10, q }, admin(owner))).traces.map((t) => t.name)
    expect(await search('100%')).toEqual(['remise'])
    expect(await search('%')).toEqual(['remise'])
    expect(await search('_')).toEqual([])
  })

  it('lit les traces sans espace (clés d’instance) à part des espaces', async () => {
    const owner = await seedUser('propriétaire')
    const workspaceId = await seedWorkspace(owner)
    const orphan = stored({ name: 'instance-only', source: 'api_key' })
    await insertTrace(orphan)
    await insertTrace(stored({ workspaceId, name: 'dans un espace' }))
    const instance = await listTraces({ workspaceId: null, limit: 50 }, admin(owner))
    expect(instance.traces.map((t) => t.name)).toContain('instance-only')
    expect(instance.traces.map((t) => t.name)).not.toContain('dans un espace')
    const inWorkspace = await listTraces({ workspaceId, limit: 50 }, admin(owner))
    expect(inWorkspace.traces.map((t) => t.name)).not.toContain('instance-only')
    await db.delete(nexoraTrace).where(eq(nexoraTrace.id, orphan.trace.id))
  })
})

describe('listTraces — pages', () => {
  it('ne répète ni ne saute aucune trace, même avec des heures de début identiques', async () => {
    const owner = await seedUser('propriétaire')
    const workspaceId = await seedWorkspace(owner)
    const sameInstant = new Date('2026-10-25T09:00:00.000Z')
    const ids: string[] = []
    for (let index = 0; index < 7; index++) {
      const trace = stored({
        workspaceId,
        startedAt: index < 5 ? sameInstant : new Date(sameInstant.getTime() - index * 1000),
      })
      ids.push(trace.trace.id)
      await insertTrace(trace)
    }
    const seen: string[] = []
    let cursor: string | null = null
    do {
      const page: Awaited<ReturnType<typeof listTraces>> = await listTraces(
        { workspaceId, limit: 3, cursor },
        admin(owner)
      )
      seen.push(...page.traces.map((t) => t.id))
      cursor = page.nextCursor
    } while (cursor)
    expect(seen).toHaveLength(7)
    expect(new Set(seen)).toEqual(new Set(ids))
  })

  it('ignore un curseur illisible plutôt que de planter', async () => {
    const owner = await seedUser('propriétaire')
    const workspaceId = await seedWorkspace(owner)
    await insertTrace(stored({ workspaceId }))
    const page = await listTraces(
      { workspaceId, limit: 10, cursor: 'pas-un-curseur' },
      admin(owner)
    )
    expect(page.traces).toHaveLength(1)
  })
})

describe('visibilité', () => {
  it('cache les traces privées d’un autre membre dans la liste, la recherche et les facettes', async () => {
    const alice = await seedUser('Alice')
    const bob = await seedUser('Bob')
    const workspaceId = await seedWorkspace(alice)
    await insertTrace(
      stored({
        workspaceId,
        userId: alice,
        visibility: 'private',
        source: 'assistant',
        name: 'secret d’Alice',
        agentId: 'wf-alice',
        agentName: 'Agent privé',
        model: 'modele-prive',
        models: ['modele-prive'],
        searchText: 'projet confidentiel',
      })
    )
    await insertTrace(stored({ workspaceId, userId: bob, name: 'partagée' }))

    const bobList = await listTraces({ workspaceId, limit: 50 }, member(bob))
    expect(bobList.traces.map((t) => t.name)).toEqual(['partagée'])
    expect(
      (await listTraces({ workspaceId, limit: 50, q: 'confidentiel' }, member(bob))).traces
    ).toEqual([])
    const bobFacets = await listFacets(workspaceId, member(bob))
    expect(bobFacets.agents.map((a) => a.id)).not.toContain('wf-alice')
    expect(bobFacets.models).not.toContain('modele-prive')
    expect(bobFacets.sources).not.toContain('assistant')

    const aliceList = await listTraces({ workspaceId, limit: 50 }, member(alice))
    expect(aliceList.traces.map((t) => t.name).sort()).toEqual(['partagée', 'secret d’Alice'])
    const adminList = await listTraces({ workspaceId, limit: 50, q: 'confidentiel' }, admin(bob))
    expect(adminList.traces.map((t) => t.name)).toEqual(['secret d’Alice'])
    expect((await listFacets(workspaceId, admin(bob))).agents.map((a) => a.id)).toContain(
      'wf-alice'
    )
  })

  it('ne mélange jamais les espaces', async () => {
    const owner = await seedUser('propriétaire')
    const first = await seedWorkspace(owner)
    const second = await seedWorkspace(owner)
    await insertTrace(stored({ workspaceId: first, name: 'du premier' }))
    await insertTrace(stored({ workspaceId: second, name: 'du second' }))
    expect(
      (await listTraces({ workspaceId: first, limit: 50 }, admin(owner))).traces.map((t) => t.name)
    ).toEqual(['du premier'])
  })
})

describe('charge', () => {
  it('sert la première page parmi 20 000 traces de cinq espaces en moins de 100 ms, par l’index de l’espace', async () => {
    const owner = await seedUser('propriétaire')
    const base = new Date('2026-10-01T00:00:00.000Z').getTime()
    const spaces = [
      await seedWorkspace(owner),
      await seedWorkspace(owner),
      await seedWorkspace(owner),
      await seedWorkspace(owner),
      await seedWorkspace(owner),
    ]
    for (const workspaceId of spaces) {
      for (let chunk = 0; chunk < 4; chunk++) {
        const rows = Array.from({ length: 1000 }, (_, index) => ({
          id: generateRandomHex(32),
          workspaceId,
          source: 'agent',
          visibility: 'workspace',
          name: `trace ${chunk * 1000 + index}`,
          status: 'ok',
          startedAt: new Date(base + (chunk * 1000 + index) * 1000),
          durationMs: 300,
          models: ['nexora-default'],
          model: 'nexora-default',
        }))
        await db.insert(nexoraTrace).values(rows)
      }
    }
    await db.execute(sql`ANALYZE nexora_trace`)
    const workspaceId = spaces[0]
    const started = performance.now()
    const page = await listTraces({ workspaceId, limit: 50 }, member(owner))
    expect(performance.now() - started).toBeLessThan(100)
    expect(page.traces).toHaveLength(50)
    expect(page.nextCursor).not.toBeNull()
    const plan = await db.execute(
      sql`EXPLAIN SELECT id FROM nexora_trace WHERE workspace_id = ${workspaceId} ORDER BY started_at DESC NULLS LAST, id DESC NULLS LAST LIMIT 51`
    )
    expect(JSON.stringify(plan)).toContain('nexora_trace_workspace_started_idx')
  })
})
