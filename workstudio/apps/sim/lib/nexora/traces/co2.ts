import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { LRUCache } from 'lru-cache'
import { fetchConsumptionByModel, type ModelConsumption } from '@/lib/nexora/consumption/by-model'
import { withEstimatedFootprint } from '@/lib/nexora/consumption/co2'

const logger = createLogger('NexoraTraceCo2')

const MEASURE_DAYS = 30
const MEASURE_TTL_MS = 10 * 60_000
const UNAVAILABLE_TTL_MS = 60_000
const DAY_MS = 86_400_000

type LoadModels = () => Promise<ModelConsumption[] | null>

const measured = new LRUCache<'models', { models: ModelConsumption[] | null }>({
  max: 1,
  ttl: MEASURE_TTL_MS,
})

/** Nexora API's per-model measure over 30 days, cached 10 minutes (1 minute when it was unreadable). */
const loadMeasuredModels: LoadModels = async () => {
  const cached = measured.get('models')
  if (cached) return cached.models
  try {
    const end = new Date()
    const models = await fetchConsumptionByModel({
      start: new Date(end.getTime() - MEASURE_DAYS * DAY_MS),
      end,
    })
    measured.set('models', { models })
    return models
  } catch (error) {
    logger.warn('Model carbon intensity could not be read', { error: getErrorMessage(error) })
    measured.set('models', { models: null }, { ttl: UNAVAILABLE_TTL_MS })
    return null
  }
}

/**
 * The carbon footprint (kgCO2eq) of each span: its tokens times the model's carbon per token as
 * Nexora API measured it (the same figure as the consumption screen). `null` for a span without a
 * measured model or without tokens — never 0, which would claim a measure.
 */
export async function co2ForSpans(
  spans: { model: string | null; tokens: number }[],
  loadModels: LoadModels = loadMeasuredModels
): Promise<(number | null)[]> {
  // A model Nexora API reports no impact for (an outside service) has no measure, not a zero one.
  const models = (await loadModels())?.filter((model) => model.kgCO2eq > 0) ?? null
  const rows = spans.map(({ model, tokens }) => ({
    tokensByModel: model && tokens > 0 ? { [model]: tokens } : {},
  }))
  return withEstimatedFootprint(rows, models).map(({ footprint }) =>
    footprint && footprint.estimatedTokens > 0 ? footprint.kgCO2eq : null
  )
}
