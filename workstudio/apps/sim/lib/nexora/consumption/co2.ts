import type { ModelConsumption } from '@/lib/nexora/consumption/by-model'

/**
 * Average car emission factor used for the "kilometres by car" equivalent: 0.193 kgCO2eq per
 * km, ADEME (Base Empreinte), recorded on the date below. Revisit when ADEME publishes a new
 * figure and change both fields together.
 */
export const CAR_EMISSION_FACTOR = {
  kgCO2eqPerKm: 0.193,
  source: 'ADEME, Base Empreinte',
  recordedOn: '2026-10-23',
} as const

export interface EstimatedFootprint {
  kgCO2eq: number
  /** Tokens whose model Nexora API measured, which the estimate covers. */
  estimatedTokens: number
  /** Tokens of models Nexora API did not measure (another provider): left out of the estimate. */
  unestimatedTokens: number
}

/** kgCO2eq per token for every name a measured model answers to (router name and aliases). */
function carbonIntensityByName(models: readonly ModelConsumption[]): Map<string, number> {
  const intensity = new Map<string, number>()
  for (const model of models) {
    if (model.totalTokens <= 0) continue
    const perToken = model.kgCO2eq / model.totalTokens
    for (const name of [model.model, ...model.aliases]) {
      if (!intensity.has(name)) intensity.set(name, perToken)
    }
  }
  return intensity
}

function estimate(
  tokensByModel: Record<string, number>,
  intensity: Map<string, number>
): EstimatedFootprint {
  let kgCO2eq = 0
  let estimatedTokens = 0
  let unestimatedTokens = 0
  for (const [model, tokens] of Object.entries(tokensByModel)) {
    const perToken = intensity.get(model)
    if (perToken === undefined) {
      unestimatedTokens += tokens
      continue
    }
    kgCO2eq += tokens * perToken
    estimatedTokens += tokens
  }
  return { kgCO2eq: Number(kgCO2eq.toFixed(9)), estimatedTokens, unestimatedTokens }
}

/**
 * Adds an estimated footprint to each row (a workspace or a person): its tokens per model times
 * that model's measured carbon per token over the same period, i.e. Nexora API's exact figure
 * shared pro rata of tokens. `models` is `null` when Nexora API could not be read, and every
 * footprint is then `null` (shown as unavailable), never zero.
 */
export function withEstimatedFootprint<T extends { tokensByModel: Record<string, number> }>(
  rows: readonly T[],
  models: readonly ModelConsumption[] | null
): Array<T & { footprint: EstimatedFootprint | null }> {
  if (!models) return rows.map((row) => ({ ...row, footprint: null }))
  const intensity = carbonIntensityByName(models)
  return rows.map((row) => ({ ...row, footprint: estimate(row.tokensByModel, intensity) }))
}

/** The distance an average car emits `kgCO2eq` over, in km. */
export function carKilometres(kgCO2eq: number): number {
  return kgCO2eq / CAR_EMISSION_FACTOR.kgCO2eqPerKm
}
