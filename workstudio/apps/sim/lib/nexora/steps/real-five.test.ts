/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import {
  applyPatch,
  planInsert,
  planMove,
  planRemove,
  type StepsPatch,
  type StepsState,
} from '@/lib/nexora/steps/edit'
import { hasStepsMarker, resolveEditorMode } from '@/lib/nexora/steps/mode'
import { readSteps, type StepNode } from '@/lib/nexora/steps/read'
import { catalogEntryById } from '@/lib/nexora/steps/catalog'
import five1 from '@/lib/nexora/steps/copilote-cinq/cinq-1.json'
import five2 from '@/lib/nexora/steps/copilote-cinq/cinq-2.json'
import five3 from '@/lib/nexora/steps/copilote-cinq/cinq-3.json'
import five4 from '@/lib/nexora/steps/copilote-cinq/cinq-4.json'
import five5 from '@/lib/nexora/steps/copilote-cinq/cinq-5.json'

/**
 * The five typical descriptions of the Copilot, as `scripts/verification/copilote-cinq.py` made them
 * on pc6 (GLM 5.3, 25/10/2026) and saved them in the database: what the Steps view really opens.
 */
const REAL = [five1, five2, five3, five4, five5].map((saved) => ({
  title: saved.plan.title,
  state: structuredClone(saved.state) as unknown as StepsState,
}))

const none = (): StepsPatch => ({
  addBlocks: [],
  removeBlockIds: [],
  addEdges: [],
  removeEdgeIds: [],
  positions: {},
})

function document(state: unknown) {
  const reading = readSteps(state)
  if (!reading.recognized) throw new Error(`refus : ${reading.reasons.join(', ')}`)
  return reading.document
}

const allIds = (state: unknown): string[] =>
  document(state).steps.flatMap((step) => [
    step.blockId,
    ...(step.branches ? [...step.branches.if, ...step.branches.else] : []).map(
      (member: StepNode) => member.blockId
    ),
  ])

const edgeKeys = (state: StepsState): string[] =>
  state.edges.map((edge) => `${edge.source}|${edge.sourceHandle}|${edge.target}`).sort()

const agent = catalogEntryById('agent')
if (!agent) throw new Error('catalogue : agent manquant')
let counter = 0
const ids = () => `edge-${++counter}`

describe.each(REAL.map((real) => [real.title, real.state] as const))(
  'workflow réel du Copilote : %s',
  (_title, state) => {
    it('s’ouvre en Étapes : repère posé et forme reconnue', () => {
      expect(hasStepsMarker(state)).toBe(true)
      const recognized = readSteps(state).recognized
      expect(recognized).toBe(true)
      expect(resolveEditorMode({ preference: null, marked: true, recognized })).toBe('steps')
    })

    it('ajouter puis retirer une étape à chaque endroit rend le workflow tel quel', () => {
      for (const anchor of [document(state).trigger.blockId, ...allIds(state)]) {
        const inserted = applyPatch(
          state,
          planInsert(state, { after: anchor }, agent, { blockId: 'neuve', name: 'neuve' }, ids)
        )
        expect(readSteps(inserted).recognized).toBe(true)
        const restored = applyPatch(inserted, planRemove(inserted, 'neuve', ids))
        expect(edgeKeys(restored)).toEqual(edgeKeys(state))
        expect(restored.blocks).toEqual(state.blocks)
      }
    })

    it('descendre puis remonter chaque étape ne change rien, aucun réglage n’est touché', () => {
      for (const id of allIds(state)) {
        const down = planMove(state, id, 'down', ids)
        if (!down) continue
        const moved = applyPatch(state, down)
        expect(readSteps(moved).recognized).toBe(true)
        for (const [blockId, block] of Object.entries(state.blocks)) {
          expect(moved.blocks[blockId].subBlocks).toEqual(block.subBlocks)
        }
        const back = applyPatch(moved, planMove(moved, id, 'up', ids) ?? none())
        expect(edgeKeys(back)).toEqual(edgeKeys(state))
        expect(back.blocks).toEqual(state.blocks)
      }
    })

    it('retirer chaque étape laisse un workflow reconnu', () => {
      for (const id of allIds(state)) {
        const removed = applyPatch(state, planRemove(state, id, ids))
        expect(readSteps(removed).recognized, id).toBe(true)
      }
    })
  }
)
