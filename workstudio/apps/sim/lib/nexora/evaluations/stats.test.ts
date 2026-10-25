/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import {
  agreement,
  compareSeries,
  percentile,
  type SeriesItem,
  type SummaryItem,
  summarizeItems,
} from '@/lib/nexora/evaluations/stats'

function item(overrides: Partial<SummaryItem> = {}): SummaryItem {
  return {
    status: 'done',
    verdict: 'pass',
    score: null,
    latencyMs: 1_000,
    inputTokens: 100,
    outputTokens: 20,
    kgCo2eq: null,
    ...overrides,
  }
}

describe('percentile', () => {
  it('renvoie null sans valeur', () => {
    expect(percentile([], 50)).toBeNull()
  })

  it('interpole linéairement entre les rangs', () => {
    const values = Array.from({ length: 100 }, (_, index) => index + 1)
    expect(percentile(values, 50)).toBeCloseTo(50.5, 5)
    expect(percentile(values, 95)).toBeCloseTo(95.05, 5)
    expect(percentile([7], 95)).toBe(7)
  })

  it('ne modifie pas le tableau reçu et accepte le désordre', () => {
    const values = [30, 10, 20]
    expect(percentile(values, 50)).toBe(20)
    expect(values).toEqual([30, 10, 20])
  })
})

describe('summarizeItems', () => {
  it('compte réussites, échecs et erreurs ; les erreurs ne sont pas des réussites', () => {
    const summary = summarizeItems([
      item({ verdict: 'pass' }),
      item({ verdict: 'pass' }),
      item({ verdict: 'fail' }),
      item({ status: 'error', verdict: null, latencyMs: null }),
    ])
    expect(summary).toMatchObject({ total: 4, finished: 4, passed: 2, failed: 1, errors: 1 })
    expect(summary.passRate).toBeCloseTo(0.5, 5)
  })

  it('compte une erreur du juge comme une erreur', () => {
    const summary = summarizeItems([item({ verdict: 'pass' }), item({ verdict: 'error' })])
    expect(summary.errors).toBe(1)
    expect(summary.passRate).toBeCloseTo(0.5, 5)
  })

  it('ne compte pas les éléments encore en attente dans le taux', () => {
    const summary = summarizeItems([
      item({ verdict: 'pass' }),
      item({ status: 'pending', verdict: null, latencyMs: null }),
      item({ status: 'running', verdict: null, latencyMs: null }),
    ])
    expect(summary).toMatchObject({ total: 3, finished: 1, passRate: 1 })
  })

  it('n’invente pas de taux sans élément terminé', () => {
    expect(summarizeItems([]).passRate).toBeNull()
    expect(summarizeItems([item({ status: 'pending', verdict: null })]).passRate).toBeNull()
  })

  it('calcule p50 et p95 de la latence et additionne les jetons', () => {
    const items = Array.from({ length: 100 }, (_, index) => item({ latencyMs: (index + 1) * 10 }))
    const summary = summarizeItems(items)
    expect(summary.latencyP50).toBeCloseTo(505, 5)
    expect(summary.latencyP95).toBeCloseTo(950.5, 5)
    expect(summary.inputTokens).toBe(10_000)
    expect(summary.outputTokens).toBe(2_000)
  })

  it('moyenne les notes qui existent', () => {
    const summary = summarizeItems([item({ score: 8 }), item({ score: 6 }), item({ score: null })])
    expect(summary.meanScore).toBeCloseTo(7, 5)
    expect(summarizeItems([item()]).meanScore).toBeNull()
  })

  it('n’affiche jamais 0 pour un CO2 non mesuré', () => {
    expect(summarizeItems([item({ kgCo2eq: null })]).kgCo2eq).toBeNull()
    expect(summarizeItems([item({ kgCo2eq: 0.002 }), item({ kgCo2eq: null })]).kgCo2eq).toBe(0.002)
  })
})

function series(rowId: string, verdict: SeriesItem['verdict'], latencyMs = 100): SeriesItem {
  return {
    rowId,
    input: `question ${rowId}`,
    answer: `réponse ${rowId}`,
    verdict,
    score: null,
    latencyMs,
  }
}

describe('compareSeries', () => {
  it('apparie par identifiant de ligne et classe chaque écart', () => {
    const result = compareSeries(
      [series('1', 'pass'), series('2', 'fail'), series('3', 'pass'), series('4', 'fail')],
      [series('1', 'pass'), series('2', 'pass'), series('3', 'fail'), series('4', 'fail')]
    )
    expect(result.rows.map((row) => [row.rowId, row.change])).toEqual([
      ['1', 'same'],
      ['2', 'improved'],
      ['3', 'regressed'],
      ['4', 'same'],
    ])
    expect(result.counts).toEqual({ improved: 1, regressed: 1, same: 2, onlyA: 0, onlyB: 0 })
  })

  it('signale une ligne présente d’un seul côté', () => {
    const result = compareSeries(
      [series('1', 'pass'), series('2', 'pass')],
      [series('2', 'pass'), series('9', 'pass')]
    )
    expect(result.rows.map((row) => [row.rowId, row.change])).toEqual([
      ['1', 'only_a'],
      ['2', 'same'],
      ['9', 'only_b'],
    ])
    expect(result.counts).toMatchObject({ onlyA: 1, onlyB: 1, same: 1 })
  })

  it('traite une erreur ou un élément sans verdict comme « non réussi »', () => {
    const result = compareSeries([series('1', 'error')], [series('1', 'pass')])
    expect(result.rows[0].change).toBe('improved')
    const reverse = compareSeries([series('1', 'pass')], [series('1', null)])
    expect(reverse.rows[0].change).toBe('regressed')
  })
})

describe('agreement', () => {
  it('mesure la part de verdicts identiques à ceux des humains', () => {
    const pairs = [
      ...Array.from({ length: 8 }, () => ({ judge: 'pass', human: 'pass' }) as const),
      { judge: 'pass', human: 'fail' } as const,
      { judge: 'fail', human: 'pass' } as const,
    ]
    expect(agreement(pairs)).toEqual({ total: 10, matched: 8, rate: 0.8 })
  })

  it('compte un verdict en erreur comme un désaccord', () => {
    expect(agreement([{ judge: 'error', human: 'pass' }])).toEqual({
      total: 1,
      matched: 0,
      rate: 0,
    })
  })

  it('n’invente pas de taux sans annotation', () => {
    expect(agreement([])).toEqual({ total: 0, matched: 0, rate: null })
  })
})
