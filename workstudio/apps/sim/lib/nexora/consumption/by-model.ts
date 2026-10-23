import { getErrorMessage } from '@sim/utils/errors'
import {
  type NexoraApiConfig,
  NexoraUsageUnavailableError,
  nexoraApiConfigFromEnv,
} from '@/lib/nexora/usage'

/** One model as Nexora API measured it over a period (all WorkStudio calls, every surface). */
export interface ModelConsumption {
  /** Nexora API router name. */
  model: string
  /** Other names the same router answers to (e.g. `nexora-default`). */
  aliases: string[]
  requests: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
  kWh: number
  kgCO2eq: number
}

interface ApiModel {
  id?: unknown
  aliases?: unknown
}

interface UsageBucket {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
  requests?: number
  impacts?: { kWh?: number; kgCO2eq?: number }
}

interface UsagePage {
  total?: number
  data?: UsageBucket[]
}

/** Nexora API's page ceiling for usage buckets (one bucket per UTC day). */
const PAGE_SIZE = 100
/** About 13 years of daily buckets: a period this code asks for never reaches it. */
const MAX_PAGES = 50
const REQUEST_TIMEOUT_MS = 15_000

async function getJson<T>(
  config: NexoraApiConfig,
  fetchFn: typeof fetch,
  path: string
): Promise<T> {
  // boundary-raw-fetch: Nexora API is an external service, not a same-origin route
  const response = await fetchFn(`${config.baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${config.apiKey}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`GET ${path} answered HTTP ${response.status}`)
  return (await response.json()) as T
}

async function modelConsumption(
  config: NexoraApiConfig,
  fetchFn: typeof fetch,
  model: { name: string; aliases: string[] },
  period: { start: Date; end: Date }
): Promise<ModelConsumption> {
  const totals: ModelConsumption = {
    model: model.name,
    aliases: model.aliases,
    requests: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    kWh: 0,
    kgCO2eq: 0,
  }
  let offset = 0
  for (let page = 0; page < MAX_PAGES; page++) {
    const query = new URLSearchParams({
      start_time: String(Math.floor(period.start.getTime() / 1000)),
      end_time: String(Math.floor(period.end.getTime() / 1000)),
      model: model.name,
      limit: String(PAGE_SIZE),
      offset: String(offset),
    })
    const body = await getJson<UsagePage>(config, fetchFn, `/me/usage?${query.toString()}`)
    const buckets = body.data ?? []
    for (const bucket of buckets) {
      const prompt = bucket.prompt_tokens ?? 0
      const completion = bucket.completion_tokens ?? 0
      totals.requests += bucket.requests ?? 0
      totals.promptTokens += prompt
      totals.completionTokens += completion
      totals.totalTokens += bucket.total_tokens ?? prompt + completion
      totals.kWh += bucket.impacts?.kWh ?? 0
      totals.kgCO2eq += bucket.impacts?.kgCO2eq ?? 0
    }
    offset += buckets.length
    const total = typeof body.total === 'number' ? body.total : undefined
    if (
      buckets.length === 0 ||
      (total !== undefined ? offset >= total : buckets.length < PAGE_SIZE)
    ) {
      break
    }
  }
  totals.kWh = Number(totals.kWh.toFixed(9))
  totals.kgCO2eq = Number(totals.kgCO2eq.toFixed(9))
  return totals
}

/**
 * Requests, tokens, energy and carbon footprint per model over `[start, end]`, as Nexora API
 * measured them for WorkStudio's key: every model it serves (`/v1/models`), each summed over
 * all its daily usage pages. All or nothing: any failed read throws
 * {@link NexoraUsageUnavailableError}, and callers show the figures as unavailable rather than
 * a partial total that looks complete.
 */
export async function fetchConsumptionByModel({
  start,
  end,
  config = nexoraApiConfigFromEnv(),
  fetchFn = fetch,
}: {
  start: Date
  end: Date
  config?: NexoraApiConfig | null
  fetchFn?: typeof fetch
}): Promise<ModelConsumption[]> {
  if (!config) throw new NexoraUsageUnavailableError('Nexora API is not configured')
  try {
    const listed = await getJson<{ data?: ApiModel[] }>(config, fetchFn, '/models')
    const models = (listed.data ?? []).flatMap((entry) =>
      typeof entry.id === 'string' && entry.id
        ? [
            {
              name: entry.id,
              aliases: Array.isArray(entry.aliases)
                ? entry.aliases.filter((alias): alias is string => typeof alias === 'string')
                : [],
            },
          ]
        : []
    )
    const consumption = await Promise.all(
      models.map((model) => modelConsumption(config, fetchFn, model, { start, end }))
    )
    return consumption.sort((a, b) => b.totalTokens - a.totalTokens)
  } catch (error) {
    throw new NexoraUsageUnavailableError(
      `Nexora API consumption could not be read: ${getErrorMessage(error, 'unknown error')}`
    )
  }
}
