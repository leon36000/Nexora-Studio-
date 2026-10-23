import { describe, expect, it } from 'vitest'
import {
  buildPlanPreview,
  stepDetails,
} from '@/app/workspace/[workspaceId]/components/copilot-dialog/plan-preview'

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

describe('stepDetails', () => {
  it('gives the whole text the summary cuts: instructions, message, address and body', () => {
    const instructions = `Vous relancez les clients. ${'Restez courtois. '.repeat(20)}`
    const url = `https://api.exemple.fr/factures?${'filtre=impayees&'.repeat(20)}`
    const agent = stepDetails({
      kind: 'agent',
      name: 'relance',
      instructions,
      message: 'Relancez {{declencheur.client}}',
      services: ['gmail'],
      knowledgeBases: ['FAQ'],
    })
    const api = stepDetails({
      kind: 'api',
      name: 'appel',
      method: 'POST',
      url,
      body: '{\n  "statut": "impayee"\n}',
    })

    expect(agent).toEqual(
      expect.arrayContaining([
        { key: 'instructions', value: instructions },
        { key: 'message', value: 'Relancez {{declencheur.client}}' },
        { key: 'services', value: 'gmail' },
        { key: 'knowledgeBases', value: 'FAQ' },
      ])
    )
    expect(api).toEqual([
      { key: 'request', value: `POST ${url}` },
      { key: 'body', value: '{\n  "statut": "impayee"\n}' },
    ])
  })

  it('lists what a response returns and what a human validates', () => {
    expect(
      stepDetails({
        kind: 'reponse',
        name: 'retour',
        fields: [{ name: 'texte', value: '{{a.b}}' }],
      })
    ).toEqual([{ key: 'fields', value: 'texte = {{a.b}}' }])
    expect(
      stepDetails({ kind: 'validation_humaine', name: 'ok', message: 'Validez le compte rendu' })
    ).toEqual([{ key: 'message', value: 'Validez le compte rendu' }])
  })

  it('shows what a condition tests and where each answer leads, to spot a wrong branch', () => {
    expect(
      stepDetails({
        kind: 'condition',
        name: 'est_valide',
        if: { ref: '{{accord.approuve}}', operator: 'egal', value: 'true' },
        then: ['envoi', 'archive'],
        else: [],
      })
    ).toEqual([
      { key: 'tested', value: 'accord.approuve' },
      { key: 'rule', value: 'true', operator: 'egal' },
      { key: 'then', value: 'envoi, archive' },
      { key: 'else', value: null },
    ])
    expect(
      stepDetails({
        kind: 'condition',
        name: 'a_reponse',
        if: { ref: 'faq.reponse', operator: 'non_vide' },
        then: [],
        else: ['escalade'],
      })
    ).toEqual([
      { key: 'tested', value: 'faq.reponse' },
      { key: 'rule', value: '', operator: 'non_vide' },
      { key: 'then', value: null },
      { key: 'else', value: 'escalade' },
    ])
  })
})
