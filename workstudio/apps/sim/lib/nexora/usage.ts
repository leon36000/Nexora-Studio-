import { getErrorMessage } from '@sim/utils/errors'
import { env } from '@/lib/core/config/env'

const DAY_SECONDS = 86_400

export class NexoraUsageUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NexoraUsageUnavailableError'
  }
}

interface NexoraUsageDay {
  /** UTC day, `YYYY-MM-DD`. */
  date: string
  requests: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface NexoraUsage {
  days: NexoraUsageDay[]
  totals: {
    requests: number
    promptTokens: number
    completionTokens: number
    totalTokens: number
    kgCO2eq: number
  }
}

export interface NexoraApiConfig {
  /** OpenAI-compatible base URL, ending in `/v1`. */
  baseUrl: string
  apiKey: string
}

interface UsageBucket {
  start_time: number
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
  requests?: number
  impacts?: { kgCO2eq?: number }
}

/** WorkStudio's own Nexora API address and key, or `null` when the instance has none. */
export function nexoraApiConfigFromEnv(): NexoraApiConfig | null {
  const baseUrl = env.VLLM_BASE_URL?.trim()
  const apiKey = env.VLLM_API_KEY?.trim()
  return baseUrl && apiKey ? { baseUrl: baseUrl.replace(/\/+$/, ''), apiKey } : null
}

/**
 * Model consumption measured by Nexora API for this WorkStudio instance over the last
 * `days` days: one row per day (newest first) and the period totals. Nexora API meters
 * every model call, so this is the instance's real usage.
 */
export async function fetchNexoraApiUsage({
  days,
  now = new Date(),
  config = nexoraApiConfigFromEnv(),
  fetchFn = fetch,
}: {
  days: number
  now?: Date
  config?: NexoraApiConfig | null
  fetchFn?: typeof fetch
}): Promise<NexoraUsage> {
  if (!config) throw new NexoraUsageUnavailableError('Nexora API is not configured')
  const end = Math.floor(now.getTime() / 1000)
  const query = new URLSearchParams({
    start_time: String(end - days * DAY_SECONDS),
    end_time: String(end),
    limit: String(Math.min(Math.max(days, 1), 100)),
  })
  let buckets: UsageBucket[]
  try {
    // boundary-raw-fetch: Nexora API is an external service, not a same-origin route
    const response = await fetchFn(`${config.baseUrl}/me/usage?${query.toString()}`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const body = (await response.json()) as { data?: UsageBucket[] }
    buckets = body.data ?? []
  } catch (error) {
    throw new NexoraUsageUnavailableError(
      `Nexora API usage could not be read: ${getErrorMessage(error, 'unknown error')}`
    )
  }

  const daysOut = buckets
    .map((bucket) => ({
      date: new Date(bucket.start_time * 1000).toISOString().slice(0, 10),
      requests: bucket.requests ?? 0,
      promptTokens: bucket.prompt_tokens ?? 0,
      completionTokens: bucket.completion_tokens ?? 0,
      totalTokens:
        bucket.total_tokens ?? (bucket.prompt_tokens ?? 0) + (bucket.completion_tokens ?? 0),
    }))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

  const totals = {
    requests: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    kgCO2eq: 0,
  }
  for (const day of daysOut) {
    totals.requests += day.requests
    totals.promptTokens += day.promptTokens
    totals.completionTokens += day.completionTokens
    totals.totalTokens += day.totalTokens
  }
  totals.kgCO2eq = Number(
    buckets.reduce((sum, bucket) => sum + (bucket.impacts?.kgCO2eq ?? 0), 0).toFixed(6)
  )
  return { days: daysOut, totals }
}
