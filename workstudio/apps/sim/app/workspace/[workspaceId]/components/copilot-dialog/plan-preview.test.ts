import { describe, expect, it } from 'vitest'
import { buildPlanPreview } from '@/app/workspace/[workspaceId]/components/copilot-dialog/plan-preview'

const plan = {
  trigger: { kind: 'planification' },
  steps: [
    { kind: 'agent', name: 'redige_relance' },
    { kind: 'condition', name: 'urgent' },
    { kind: 'reponse', name: 'resultat' },
  ],
}

const summary = [
  'Chaque lundi à 09:00.',
  'Rédige la relance.',
  'Vérifie si le message est urgent.',
  'Renvoie le résultat.',
]

describe('buildPlanPreview', () => {
  it('puts the trigger first, then each step with its own sentence', () => {
    const rows = buildPlanPreview(plan, summary)
    expect(rows.map((row) => [row.type, row.name, row.sentence])).toEqual([
      ['planification', null, 'Chaque lundi à 09:00.'],
      ['agent', 'redige_relance', 'Rédige la relance.'],
      ['condition', 'urgent', 'Vérifie si le message est urgent.'],
      ['reponse', 'resultat', 'Renvoie le résultat.'],
    ])
  })

  it('gives every row a distinct key, even when a step is named like the trigger row', () => {
    const rows = buildPlanPreview(
      { trigger: { kind: 'manuel' }, steps: [{ kind: 'agent', name: 'trigger' }] },
      ['Lancé à la main.', 'Répond.']
    )
    expect(new Set(rows.map((row) => row.key)).size).toBe(rows.length)
  })

  it('shows no sentence rather than a misaligned one when the summary does not match the steps', () => {
    const rows = buildPlanPreview(plan, summary.slice(0, 3))
    expect(rows).toHaveLength(4)
    expect(rows.every((row) => row.sentence === null)).toBe(true)
  })

  it('shows an unknown step or trigger kind as a generic step instead of failing', () => {
    const rows = buildPlanPreview(
      { trigger: { kind: 'email' }, steps: [{ kind: 'boucle', name: 'chaque_ligne' }] },
      ['Quand un e-mail arrive.', 'Pour chaque ligne.']
    )
    expect(rows.map((row) => row.type)).toEqual(['unknown', 'unknown'])
    expect(rows[1].name).toBe('chaque_ligne')
  })

  it('does not take a step kind for a trigger kind, nor the reverse', () => {
    const rows = buildPlanPreview(
      { trigger: { kind: 'agent' }, steps: [{ kind: 'webhook', name: 'appel' }] },
      ['?', '?']
    )
    expect(rows.map((row) => row.type)).toEqual(['unknown', 'unknown'])
  })
})
