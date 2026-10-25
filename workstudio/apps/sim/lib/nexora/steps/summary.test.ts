/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import { compilePlan } from '@/lib/nexora/copilot/compile'
import { FIVE_PLANS_CONTEXT, fivePlans } from '@/lib/nexora/steps/five-plans.fixtures'
import { summarizeStep } from '@/lib/nexora/steps/summary'

const blockNamed = (planIndex: number, name: string) => {
  const { state } = compilePlan(fivePlans()[planIndex], FIVE_PLANS_CONTEXT)
  const found = Object.values(state.blocks).find((block) => block.name === name)
  if (!found) throw new Error(`bloc ${name} introuvable`)
  return found
}

describe('summarizeStep', () => {
  it('résume une condition compilée par le Copilote en une phrase', () => {
    expect(summarizeStep(blockNamed(1, 'est_urgent'))).toEqual({
      key: 'condition.egal',
      values: { ref: 'classer.categorie', value: 'urgent' },
    })
  })

  it.each([
    ['String(<a.b> ?? \'\').trim().toLowerCase().includes("retard")', 'condition.contient', { ref: 'a.b', value: 'retard' }],
    ['String(<a.b> ?? \'\').trim().toLowerCase() !== "non"', 'condition.different', { ref: 'a.b', value: 'non' }],
    ['Number(<a.b>) > 100', 'condition.superieur', { ref: 'a.b', value: '100' }],
    ['Number(<a.b>) < 5', 'condition.inferieur', { ref: 'a.b', value: '5' }],
    ['String(<a.b> ?? \'\').trim().toLowerCase() === \'\'', 'condition.vide', { ref: 'a.b' }],
    ['String(<a.b> ?? \'\').trim().toLowerCase() !== \'\'', 'condition.non_vide', { ref: 'a.b' }],
  ])('relit la règle %s', (expression, key, values) => {
    const block = {
      type: 'condition',
      subBlocks: { conditions: { id: 'conditions', type: 'condition-input', value: JSON.stringify([{ id: 'x-if', title: 'if', value: expression }, { id: 'x-else', title: 'else', value: '' }]) } },
    }
    expect(summarizeStep(block)).toEqual({ key, values })
  })

  it('montre une règle écrite à la main telle quelle', () => {
    const block = {
      type: 'condition',
      subBlocks: { conditions: { id: 'conditions', type: 'condition-input', value: JSON.stringify([{ id: 'x-if', title: 'if', value: '<a.b> === 3' }]) } },
    }
    expect(summarizeStep(block)).toEqual({ key: 'condition.custom', values: { expression: '<a.b> === 3' } })
  })

  it('résume un appel d’API, une attente, une réponse et une consigne d’agent', () => {
    expect(summarizeStep(blockNamed(4, 'appel'))).toEqual({
      key: 'api',
      values: { method: 'GET', url: '<start.url>' },
    })
    expect(summarizeStep(blockNamed(4, 'pause'))).toEqual({ key: 'wait', values: { amount: '5', unit: 'seconds' } })
    expect(summarizeStep(blockNamed(4, 'resultat'))).toEqual({ key: 'response', values: { fields: 'resume' } })
    expect(summarizeStep(blockNamed(4, 'resumer'))?.key).toBe('agent')
  })

  it('coupe une consigne trop longue et ne renvoie rien pour un bloc sans résumé', () => {
    const long = {
      type: 'agent',
      subBlocks: { messages: { id: 'messages', type: 'messages-input', value: [{ role: 'system', content: 's' }, { role: 'user', content: 'x'.repeat(300) }] } },
    }
    const summary = summarizeStep(long)
    expect(summary?.values.request.length).toBeLessThanOrEqual(101)
    expect(summarizeStep({ type: 'knowledge', subBlocks: {} })).toBeNull()
  })
})
