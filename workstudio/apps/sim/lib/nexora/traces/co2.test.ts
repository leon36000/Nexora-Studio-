/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import type { ModelConsumption } from '@/lib/nexora/consumption/by-model'
import { co2ForSpans } from '@/lib/nexora/traces/co2'

const glm: ModelConsumption = {
  model: 'cloud-glm-5-3',
  aliases: ['nexora-default'],
  requests: 10,
  promptTokens: 8000,
  completionTokens: 2000,
  totalTokens: 10_000,
  kWh: 0.5,
  kgCO2eq: 0.2,
}

describe('co2ForSpans', () => {
  it('multiplie les jetons par l’intensité mesurée du modèle, alias compris', async () => {
    const result = await co2ForSpans(
      [
        { model: 'cloud-glm-5-3', tokens: 1000 },
        { model: 'nexora-default', tokens: 500 },
      ],
      async () => [glm]
    )
    expect(result[0]).toBeCloseTo(0.02, 9)
    expect(result[1]).toBeCloseTo(0.01, 9)
  })

  it('rend null pour un modèle non mesuré, un span sans modèle ou sans jeton', async () => {
    const result = await co2ForSpans(
      [
        { model: 'autre-fournisseur', tokens: 1000 },
        { model: null, tokens: 1000 },
        { model: 'cloud-glm-5-3', tokens: 0 },
      ],
      async () => [glm]
    )
    expect(result).toEqual([null, null, null])
  })

  it('rend null pour un modèle dont Nexora API ne mesure aucun impact (0 kgCO2eq reporté)', async () => {
    const result = await co2ForSpans([{ model: 'cloud-glm-5-3', tokens: 1000 }], async () => [
      { ...glm, kgCO2eq: 0, kWh: 0 },
    ])
    expect(result).toEqual([null])
  })

  it('rend null partout (jamais 0) quand Nexora API ne répond pas', async () => {
    const result = await co2ForSpans([{ model: 'cloud-glm-5-3', tokens: 1000 }], async () => null)
    expect(result).toEqual([null])
  })

  it('n’interroge qu’une fois pour tous les spans', async () => {
    let calls = 0
    await co2ForSpans(
      [
        { model: 'cloud-glm-5-3', tokens: 1 },
        { model: 'cloud-glm-5-3', tokens: 2 },
      ],
      async () => {
        calls += 1
        return [glm]
      }
    )
    expect(calls).toBe(1)
  })
})
