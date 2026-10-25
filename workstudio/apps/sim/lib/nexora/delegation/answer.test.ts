import { describe, expect, it } from 'vitest'
import { citeSourcesByName } from '@/lib/nexora/delegation/answer'

const sources = [
  { index: 1, title: 'Tarifs 2026.pdf' },
  { index: 2, title: 'Conditions de vente.pdf' },
]

describe('answer of a called agent', () => {
  it('replaces its numbered references with the names of its sources', () => {
    expect(citeSourcesByName('Le pain coûte 1,20 euro [1]. Livraison offerte [2].', sources)).toBe(
      'Le pain coûte 1,20 euro (source : Tarifs 2026.pdf). Livraison offerte (source : Conditions de vente.pdf).'
    )
  })

  it('groups several references of one place and names each source once', () => {
    expect(citeSourcesByName('Remise de 10 % [1][1][2] et [1, 2].', sources)).toBe(
      'Remise de 10 % (sources : Tarifs 2026.pdf ; Conditions de vente.pdf) et (sources : Tarifs 2026.pdf ; Conditions de vente.pdf).'
    )
  })

  it('drops a reference to a source the agent did not list, without leaving a hole', () => {
    expect(citeSourcesByName('Voir le détail [7] ci-dessous.', sources)).toBe(
      'Voir le détail ci-dessous.'
    )
  })

  it('leaves a text without references, and brackets that are not references, unchanged', () => {
    const text = 'Total : [à confirmer] ou [1er janvier].'
    expect(citeSourcesByName(text, sources)).toBe(text)
  })

  it('removes every reference when the agent returned no sources', () => {
    expect(citeSourcesByName('Prix : 80 euros [1].', [])).toBe('Prix : 80 euros.')
  })
})
