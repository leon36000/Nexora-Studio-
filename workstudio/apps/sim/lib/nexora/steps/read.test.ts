/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import { compilePlan } from '@/lib/nexora/copilot/compile'
import { FIVE_PLANS_CONTEXT, fivePlans } from '@/lib/nexora/steps/five-plans.fixtures'
import { linksOf, readSteps } from '@/lib/nexora/steps/read'

const compiled = fivePlans().map((plan) => ({
  plan,
  state: compilePlan(plan, FIVE_PLANS_CONTEXT).state,
}))

function recognized(state: unknown) {
  const reading = readSteps(state)
  if (!reading.recognized) throw new Error(`refus : ${reading.reasons.join(', ')}`)
  return reading.document
}

/** A copy of a compiled state that a test may break. */
function copyOf(index: number) {
  return structuredClone(compiled[index].state) as {
    blocks: Record<string, Record<string, unknown> & { type: string; name: string }>
    edges: {
      id: string
      source: string
      target: string
      sourceHandle: string
      targetHandle: string
    }[]
    loops: Record<string, unknown>
    parallels: Record<string, unknown>
  }
}

const idOfName = (state: ReturnType<typeof copyOf>, name: string): string => {
  const found = Object.entries(state.blocks).find(([, block]) => block.name === name)
  if (!found) throw new Error(`bloc ${name} introuvable`)
  return found[0]
}

describe('readSteps : les cinq workflows types du Copilote', () => {
  it.each(compiled.map(({ plan }, index) => [plan.title, index] as const))(
    '« %s » est reconnu, étape pour étape',
    (_title, index) => {
      const { plan, state } = compiled[index]
      const document = recognized(state)
      const mainNames = document.steps.map((step) => step.name)
      const inBranches = new Set(
        plan.steps.flatMap((step) =>
          step.kind === 'condition' ? [...step.then, ...step.else] : []
        )
      )
      expect(mainNames).toEqual(
        plan.steps.map((step) => step.name).filter((n) => !inBranches.has(n))
      )
      for (const step of plan.steps) {
        if (step.kind !== 'condition') continue
        const read = document.steps.find((candidate) => candidate.name === step.name)
        expect(read?.branches?.if.map((s) => s.name)).toEqual(step.then)
        expect(read?.branches?.else.map((s) => s.name)).toEqual(step.else)
      }
    }
  )

  it.each(compiled.map(({ plan }, index) => [plan.title, index] as const))(
    '« %s » : les liens relus sont exactement les arêtes compilées',
    (_title, index) => {
      const { state } = compiled[index]
      const document = recognized(state)
      const actual = state.edges
        .map((edge) => `${edge.source}|${edge.sourceHandle}|${edge.target}`)
        .sort()
      const expected = linksOf(document)
        .map(
          (link) =>
            `${link.from}|${link.handle === 'source' ? 'source' : `condition-${link.from}-${link.handle}`}|${link.to}`
        )
        .sort()
      expect(expected).toEqual(actual)
    }
  )

  it('reconnaît le déclencheur selon son type', () => {
    expect(recognized(compiled[0].state).trigger.type).toBe('schedule')
    expect(recognized(compiled[1].state).trigger.type).toBe('generic_webhook')
    expect(recognized(compiled[2].state).trigger.type).toBe('start_trigger')
  })

  it('une condition dont seule la branche « oui » est reliée est reconnue (compte rendu)', () => {
    const document = recognized(compiled[3].state)
    const condition = document.steps.find((step) => step.name === 'approuve')
    expect(condition?.branches?.if.map((s) => s.name)).toEqual(['envoyer'])
    expect(condition?.branches?.else).toEqual([])
    expect(document.steps.at(-1)?.name).toBe('approuve')
  })
})

describe('readSteps : formes refusées (lecture seule)', () => {
  const refusal = (state: unknown) => {
    const reading = readSteps(state)
    if (reading.recognized) throw new Error('reconnu à tort')
    return reading
  }

  it('refuse un workflow sans déclencheur', () => {
    const state = copyOf(0)
    delete state.blocks[idOfName(state, 'Planification')]
    expect(refusal(state).reasons).toContain('no-trigger')
  })

  it('refuse deux déclencheurs', () => {
    const state = copyOf(0)
    state.blocks.extra = {
      id: 'extra',
      type: 'start_trigger',
      name: 'Start',
      subBlocks: {},
      enabled: true,
    }
    expect(refusal(state).reasons).toContain('several-triggers')
  })

  it('refuse un bloc que le catalogue ne connaît pas', () => {
    const state = copyOf(0)
    state.blocks[idOfName(state, 'rediger_relances')].type = 'router_v2'
    expect(refusal(state).reasons).toContain('unknown-block')
  })

  it('refuse un bloc désactivé ou verrouillé', () => {
    const disabled = copyOf(0)
    disabled.blocks[idOfName(disabled, 'resultat')].enabled = false
    expect(refusal(disabled).reasons).toContain('disabled-block')
    const locked = copyOf(0)
    locked.blocks[idOfName(locked, 'resultat')].locked = true
    expect(refusal(locked).reasons).toContain('locked-block')
  })

  it('refuse une boucle et un bloc rangé dans un conteneur', () => {
    const withLoop = copyOf(0)
    withLoop.loops = { boucle: { id: 'boucle', nodes: [] } }
    expect(refusal(withLoop).reasons).toContain('subflow')
    const inside = copyOf(0)
    inside.blocks[idOfName(inside, 'resultat')].data = { parentId: 'boucle' }
    expect(refusal(inside).reasons).toContain('subflow')
  })

  it('refuse une arête en trop et une étape non reliée', () => {
    const extraEdge = copyOf(0)
    const [first, second] = extraEdge.edges
    extraEdge.edges.push({ ...second, id: 'copie', source: first.source })
    expect(refusal(extraEdge).reasons).toContain('extra-edges')
    const orphan = copyOf(0)
    orphan.edges.pop()
    expect(refusal(orphan).reasons).toContain('unreachable')
  })

  it('refuse une condition dans une branche', () => {
    const state = copyOf(1)
    const condition = idOfName(state, 'est_urgent')
    const alert = idOfName(state, 'alerter')
    state.blocks[alert].type = 'condition'
    expect(state.edges.some((edge) => edge.source === condition)).toBe(true)
    expect(refusal(state).reasons).toContain('branch-in-branch')
  })

  it('donne, pour la lecture seule, tous les blocs dans l’ordre du chemin puis par position', () => {
    const state = copyOf(0)
    state.blocks[idOfName(state, 'resultat')].enabled = false
    const { order } = refusal(state)
    expect(order.map((id) => state.blocks[id].name)).toEqual([
      'Planification',
      'rediger_relances',
      'resultat',
    ])
  })

  it('ne plante pas sur un état vide ou malformé', () => {
    expect(readSteps(null).recognized).toBe(false)
    expect(readSteps({ blocks: 3, edges: [] }).recognized).toBe(false)
    expect(readSteps({ blocks: {}, edges: [] }).recognized).toBe(false)
  })
})
