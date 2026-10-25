/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import { compilePlan } from '@/lib/nexora/copilot/compile'
import { catalogEntryById } from '@/lib/nexora/steps/catalog'
import {
  applyPatch,
  layoutPositions,
  planInsert,
  planMove,
  planRemove,
  StepsEditError,
  type StepsState,
} from '@/lib/nexora/steps/edit'
import { FIVE_PLANS_CONTEXT, fivePlans } from '@/lib/nexora/steps/five-plans.fixtures'
import { linksOf, readSteps, type StepNode } from '@/lib/nexora/steps/read'

const states = fivePlans().map(
  (plan) => compilePlan(plan, FIVE_PLANS_CONTEXT).state as unknown as StepsState
)

const document = (state: unknown) => {
  const reading = readSteps(state)
  if (!reading.recognized) throw new Error(`refus : ${reading.reasons.join(', ')}`)
  return reading.document
}

const stepIds = (state: unknown): string[] =>
  document(state).steps.flatMap((step) => [
    step.blockId,
    ...(step.branches
      ? [...step.branches.if, ...step.branches.else].map((s: StepNode) => s.blockId)
      : []),
  ])

const edgeKeys = (state: StepsState): string[] =>
  state.edges.map((edge) => `${edge.source}|${edge.sourceHandle}|${edge.target}`).sort()

/** The state with positions left out: what must survive an edit that moves nothing. */
const withoutPositions = (state: StepsState) =>
  JSON.stringify(
    Object.fromEntries(
      Object.entries(state.blocks)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([id, block]) => [id, { ...block, position: null }])
    )
  )

let counter = 0
const ids = () => `neuf-${++counter}`

const agent = catalogEntryById('agent')
if (!agent) throw new Error('catalogue : agent manquant')

describe('layoutPositions', () => {
  it.each(states.map((state, index) => [index, state] as const))(
    'reproduit la disposition du Copilote (workflow %i)',
    (_index, state) => {
      const positions = layoutPositions(document(state))
      for (const [id, block] of Object.entries(state.blocks)) {
        expect(positions[id], block.name).toEqual(block.position)
      }
    }
  )
})

describe('planInsert', () => {
  it.each(states.map((state, index) => [index, state] as const))(
    'ajoute une étape après chacune des étapes du workflow %i, et le retrait la défait',
    (_index, state) => {
      for (const anchor of [document(state).trigger.blockId, ...stepIds(state)]) {
        const patch = planInsert(
          state,
          { after: anchor },
          agent,
          { blockId: 'nouvelle', name: 'nouvelle' },
          ids
        )
        const inserted = applyPatch(state, patch)
        const reading = document(inserted)
        expect(stepIds(inserted)).toHaveLength(stepIds(state).length + 1)
        expect(stepIds(inserted)).toContain('nouvelle')
        expect(reading.trigger.blockId).toBe(document(state).trigger.blockId)

        const restored = applyPatch(inserted, planRemove(inserted, 'nouvelle', ids))
        expect(edgeKeys(restored)).toEqual(edgeKeys(state))
        expect(withoutPositions(restored)).toBe(withoutPositions(state))
      }
    }
  )

  it('ajoute au début d’une branche', () => {
    const state = states[1]
    const condition = document(state).steps.find((step) => step.branches)
    if (!condition) throw new Error('condition attendue')
    const patch = planInsert(
      state,
      { branch: { condition: condition.blockId, side: 'if' } },
      agent,
      { blockId: 'debut', name: 'debut' },
      ids
    )
    const read = document(applyPatch(state, patch)).steps.find((step) => step.branches)
    expect(read?.branches?.if.map((s) => s.blockId)).toEqual([
      'debut',
      condition.branches?.if[0].blockId,
    ])
  })

  it('met une branche vide en chemin direct puis la remplit (compte rendu : côté « sinon »)', () => {
    const state = states[3]
    const condition = document(state).steps.find((step) => step.branches)
    if (!condition) throw new Error('condition attendue')
    const patch = planInsert(
      state,
      { branch: { condition: condition.blockId, side: 'else' } },
      agent,
      { blockId: 'refus', name: 'refus' },
      ids
    )
    const read = document(applyPatch(state, patch)).steps.find((step) => step.branches)
    expect(read?.branches?.else.map((s) => s.blockId)).toEqual(['refus'])
  })

  it('ajoute une condition dans la ligne principale, avec deux chemins vers l’étape suivante', () => {
    const state = states[0]
    const first = document(state).steps[0]
    const condition = catalogEntryById('condition')
    if (!condition) throw new Error('catalogue : condition manquante')
    const inserted = applyPatch(
      state,
      planInsert(state, { after: first.blockId }, condition, { blockId: 'si', name: 'si' }, ids)
    )
    const read = document(inserted).steps.find((step) => step.blockId === 'si')
    expect(read?.branches).toEqual({ if: [], else: [] })
    const fromCondition = inserted.edges.filter((edge) => edge.source === 'si')
    expect(fromCondition.map((edge) => edge.sourceHandle).sort()).toEqual([
      'condition-si-else',
      'condition-si-if',
    ])
  })

  it('refuse une condition dans une branche et un point d’insertion inconnu', () => {
    const state = states[1]
    const condition = document(state).steps.find((step) => step.branches)
    const asCondition = catalogEntryById('condition')
    if (!condition || !asCondition) throw new Error('attendu')
    const insertCondition = () =>
      planInsert(
        state,
        { branch: { condition: condition.blockId, side: 'if' } },
        asCondition,
        { blockId: 'x', name: 'x' },
        ids
      )
    expect(insertCondition).toThrow(StepsEditError)
    expect(() =>
      planInsert(state, { after: 'inconnu' }, agent, { blockId: 'x', name: 'x' }, ids)
    ).toThrow(StepsEditError)
  })

  it('refuse d’écrire dans un workflow dont la forme n’est pas reconnue', () => {
    const broken = structuredClone(states[0])
    broken.edges.pop()
    expect(() =>
      planInsert(
        broken,
        { after: document(states[0]).trigger.blockId },
        agent,
        { blockId: 'x', name: 'x' },
        ids
      )
    ).toThrow(StepsEditError)
  })
})

describe('planRemove', () => {
  it.each(states.map((state, index) => [index, state] as const))(
    'retire chaque étape du workflow %i en recollant les arêtes',
    (_index, state) => {
      for (const id of stepIds(state)) {
        const after = applyPatch(state, planRemove(state, id, ids))
        const removed = document(state).steps.find((step) => step.blockId === id)
        const lost =
          1 + (removed?.branches ? removed.branches.if.length + removed.branches.else.length : 0)
        expect(stepIds(after)).toHaveLength(stepIds(state).length - lost)
        expect(after.blocks[id]).toBeUndefined()
        const known = new Set(Object.keys(after.blocks))
        for (const edge of after.edges) {
          expect(known.has(edge.source) && known.has(edge.target)).toBe(true)
        }
      }
    }
  )

  it('retirer une condition retire aussi les étapes de ses branches', () => {
    const state = states[1]
    const condition = document(state).steps.find((step) => step.branches)
    if (!condition) throw new Error('condition attendue')
    const after = applyPatch(state, planRemove(state, condition.blockId, ids))
    expect(document(after).steps.map((step) => step.name)).toEqual(['classer', 'conclusion'])
  })

  it('ne retire pas le déclencheur', () => {
    expect(() => planRemove(states[0], document(states[0]).trigger.blockId, ids)).toThrow(
      StepsEditError
    )
  })
})

describe('planMove', () => {
  it.each(states.map((state, index) => [index, state] as const))(
    'descendre puis remonter chaque étape du workflow %i ne change rien',
    (_index, state) => {
      for (const id of stepIds(state)) {
        const down = planMove(state, id, 'down', ids)
        if (!down) continue
        const moved = applyPatch(state, down)
        const up = planMove(moved, id, 'up', ids)
        if (!up) throw new Error(`l’étape ${id} ne remonte pas`)
        const back = applyPatch(moved, up)
        expect(edgeKeys(back)).toEqual(edgeKeys(state))
        expect(JSON.stringify(back.blocks)).toBe(JSON.stringify(state.blocks))
      }
    }
  )

  it('échange deux étapes voisines de la ligne principale', () => {
    const state = states[4]
    const [appel, resumer] = document(state).steps
    const moved = applyPatch(
      state,
      planMove(state, appel.blockId, 'down', ids) ?? {
        addBlocks: [],
        removeBlockIds: [],
        addEdges: [],
        removeEdgeIds: [],
        positions: {},
      }
    )
    expect(
      document(moved)
        .steps.slice(0, 2)
        .map((s) => s.blockId)
    ).toEqual([resumer.blockId, appel.blockId])
  })

  it('ne bouge pas la première étape vers le haut ni la dernière vers le bas', () => {
    const state = states[4]
    const steps = document(state).steps
    expect(planMove(state, steps[0].blockId, 'up', ids)).toBeNull()
    expect(planMove(state, steps[steps.length - 1].blockId, 'down', ids)).toBeNull()
  })

  it('une étape de branche reste dans sa branche', () => {
    const state = states[1]
    const condition = document(state).steps.find((step) => step.branches)
    const member = condition?.branches?.if[0]
    if (!member) throw new Error('membre attendu')
    expect(planMove(state, member.blockId, 'down', ids)).toBeNull()
    expect(planMove(state, member.blockId, 'up', ids)).toBeNull()
  })

  it('les liens relus après un déplacement sont exactement les arêtes', () => {
    const state = states[3]
    const rediger = document(state).steps[0]
    const moved = applyPatch(
      state,
      planMove(state, rediger.blockId, 'down', ids) ?? {
        addBlocks: [],
        removeBlockIds: [],
        addEdges: [],
        removeEdgeIds: [],
        positions: {},
      }
    )
    const expected = linksOf(document(moved))
      .map(
        (link) =>
          `${link.from}|${link.handle === 'source' ? 'source' : `condition-${link.from}-${link.handle}`}|${link.to}`
      )
      .sort()
    expect(edgeKeys(moved)).toEqual(expected)
  })
})
