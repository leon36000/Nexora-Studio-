/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import type { NexoraTraceSpan } from '@/lib/api/contracts/nexora-traces'
import {
  durationFilterMs,
  flattenSpanTree,
  formatCo2,
  formatDuration,
  periodStart,
} from '@/app/workspace/[workspaceId]/traces/utils/span-tree'

function span(id: string, parentId: string | null, position: number): NexoraTraceSpan {
  return {
    id,
    parentId,
    position,
    kind: 'step',
    name: id,
    model: null,
    startedAt: '2026-10-25T10:00:00.000Z',
    durationMs: 10,
    status: 'ok',
    inputTokens: 0,
    outputTokens: 0,
    kgCo2eq: null,
    input: null,
    output: null,
    attributes: {},
  }
}

describe('flattenSpanTree', () => {
  it('range les spans en arbre : parent, puis enfants dans l’ordre, avec leur profondeur', () => {
    const rows = flattenSpanTree([
      span('racine', null, 0),
      span('agent', 'racine', 1),
      span('modèle 1', 'agent', 2),
      span('outil', 'agent', 3),
      span('modèle 2', 'agent', 4),
      span('autre', 'racine', 5),
    ])
    expect(rows.map((row) => `${row.depth}:${row.span.id}`)).toEqual([
      '0:racine',
      '1:agent',
      '2:modèle 1',
      '2:outil',
      '2:modèle 2',
      '1:autre',
    ])
  })

  it('traite un span dont le parent manque comme une racine, sans rien perdre', () => {
    const rows = flattenSpanTree([span('a', 'absent', 0), span('b', 'a', 1)])
    expect(rows.map((row) => `${row.depth}:${row.span.id}`)).toEqual(['0:a', '1:b'])
  })

  it('ne boucle pas sur des parents qui se citent les uns les autres', () => {
    const rows = flattenSpanTree([span('a', 'b', 0), span('b', 'a', 1), span('c', null, 2)])
    expect(rows.map((row) => row.span.id)).toEqual(['c'])
  })

  it('suit la position enregistrée, pas l’ordre dans lequel les spans arrivent', () => {
    const rows = flattenSpanTree([span('b', null, 2), span('a', null, 1)])
    expect(rows.map((row) => row.span.id)).toEqual(['a', 'b'])
  })

  it('rend une liste vide pour aucun span', () => {
    expect(flattenSpanTree([])).toEqual([])
  })
})

describe('formatDuration', () => {
  it.each([
    [0, '0 ms'],
    [850, '850 ms'],
    [1000, '1,0 s'],
    [12_400, '12,4 s'],
    [59_949, '59,9 s'],
    [59_960, '1 min 0 s'],
    [60_000, '1 min 0 s'],
    [125_000, '2 min 5 s'],
  ])('%d ms ⇒ « %s »', (ms, expected) => {
    expect(formatDuration(ms, 'fr')).toBe(expected)
  })

  it('met le séparateur décimal de la langue', () => {
    expect(formatDuration(12_400, 'en')).toBe('12.4 s')
  })
})

describe('formatCo2', () => {
  it.each([
    [null, '—'],
    [0.00012, '0,12 g'],
    [0.0000004, '0,0004 g'],
    [1.5, '1,5 kg'],
  ])('%s kg ⇒ « %s »', (kg, expected) => {
    expect(formatCo2(kg, 'fr')).toBe(expected)
  })
})

describe('filtres de durée et de période', () => {
  it('traduit « durée > 10 s » en millisecondes et rien en « toutes »', () => {
    expect(durationFilterMs('10000')).toBe(10_000)
    expect(durationFilterMs('')).toBeUndefined()
    expect(durationFilterMs('n’importe quoi')).toBeUndefined()
  })

  it('traduit une période en date de début', () => {
    const now = new Date('2026-10-25T12:00:00.000Z')
    expect(periodStart('24h', now)).toBe('2026-10-24T12:00:00.000Z')
    expect(periodStart('7d', now)).toBe('2026-10-18T12:00:00.000Z')
    expect(periodStart('', now)).toBeUndefined()
  })
})
