import { describe, expect, it } from 'vitest'
import type { ModelConsumption } from '@/lib/nexora/consumption/by-model'
import {
  CAR_EMISSION_FACTOR,
  carKilometres,
  withEstimatedFootprint,
} from '@/lib/nexora/consumption/co2'

function model(
  name: string,
  totalTokens: number,
  kgCO2eq: number,
  aliases: string[] = []
): ModelConsumption {
  return {
    model: name,
    aliases,
    requests: 1,
    promptTokens: totalTokens,
    completionTokens: 0,
    totalTokens,
    kWh: 0,
    kgCO2eq,
  }
}

describe('withEstimatedFootprint', () => {
  it('shares a model footprint pro rata of the tokens each workspace used', () => {
    const [compta, rh] = withEstimatedFootprint(
      [
        { tokensByModel: { 'mistral-small': 1_000 } },
        { tokensByModel: { 'mistral-small': 9_000 } },
      ],
      [model('mistral-small', 10_000, 0.5)]
    )
    expect(compta.footprint?.kgCO2eq).toBeCloseTo(0.05, 9)
    expect(rh.footprint?.kgCO2eq).toBeCloseTo(0.45, 9)
  })

  it('adds the footprints of several models', () => {
    const [row] = withEstimatedFootprint(
      [{ tokensByModel: { 'mistral-small': 100, 'llama-70b': 100 } }],
      [model('mistral-small', 1_000, 0.01), model('llama-70b', 1_000, 0.1)]
    )
    expect(row.footprint?.kgCO2eq).toBeCloseTo(0.011, 9)
  })

  it('finds a model WorkStudio knew only by its alias', () => {
    const [row] = withEstimatedFootprint(
      [{ tokensByModel: { 'nexora-default': 500 } }],
      [model('mistral-small', 1_000, 0.2, ['nexora-default'])]
    )
    expect(row.footprint).toEqual({ kgCO2eq: 0.1, estimatedTokens: 500, unestimatedTokens: 0 })
  })

  it('counts tokens of a model Nexora API does not know as not estimated, not as zero carbon', () => {
    const [row] = withEstimatedFootprint(
      [{ tokensByModel: { 'gpt-4o': 300, 'mistral-small': 100 } }],
      [model('mistral-small', 1_000, 0.2), model('silent', 0, 0.3)]
    )
    expect(row.footprint).toMatchObject({ estimatedTokens: 100, unestimatedTokens: 300 })
  })

  it('marks the footprint unavailable when Nexora API could not be read', () => {
    const rows = withEstimatedFootprint(
      [{ tokensByModel: { 'mistral-small': 1 }, id: 'ws-1' }],
      null
    )
    expect(rows).toEqual([{ tokensByModel: { 'mistral-small': 1 }, id: 'ws-1', footprint: null }])
  })
})

describe('carKilometres', () => {
  it('converts kgCO2eq into kilometres driven with the dated ADEME factor', () => {
    expect(CAR_EMISSION_FACTOR.kgCO2eqPerKm).toBe(0.193)
    expect(carKilometres(1.93)).toBeCloseTo(10, 9)
    expect(carKilometres(0)).toBe(0)
  })
})
