import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { isRecordLike } from '@sim/utils/object'
import { LRUCache } from 'lru-cache'
import { GatewayError, gatewayErrors } from '@/lib/nexora/developer-api/errors'
import { nexoraApiConfigFromEnv } from '@/lib/nexora/usage'

const logger = createLogger('NexoraDeveloperApiUpstream')

/** A model as Nexora API lists it (OpenAI shape plus its aliases). */
export interface UpstreamModel extends Record<string, unknown> {
  id: string
  aliases: string[]
}

/** The model list moves when an administrator adds a model or changes the default. */
const MODELS_TTL_MS = 30_000
const MODELS_TIMEOUT_MS = 10_000

const modelsCache = new LRUCache<'models', UpstreamModel[]>({
  max: 1,
  ttl: MODELS_TTL_MS,
  fetchMethod: async () => fetchModels(),
})

function upstreamConfig() {
  const config = nexoraApiConfigFromEnv()
  if (!config) throw gatewayErrors.unavailable()
  return config
}

async function fetchModels(): Promise<UpstreamModel[]> {
  const config = upstreamConfig()
  // boundary-raw-fetch: Nexora API is an external service, not a same-origin route
  const response = await fetch(`${config.baseUrl}/models`, {
    headers: { Authorization: `Bearer ${config.apiKey}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(MODELS_TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`GET /models answered HTTP ${response.status}`)
  const body: unknown = await response.json()
  const data = isRecordLike(body) && Array.isArray(body.data) ? body.data : []
  return data.flatMap((entry) =>
    isRecordLike(entry) && typeof entry.id === 'string' && entry.id
      ? [
          {
            ...entry,
            id: entry.id,
            aliases: Array.isArray(entry.aliases)
              ? entry.aliases.filter((alias): alias is string => typeof alias === 'string')
              : [],
          },
        ]
      : []
  )
}

/** Nexora API's models (cached briefly); throws a 503 {@link GatewayError} when unreachable. */
export async function listUpstreamModels(): Promise<UpstreamModel[]> {
  try {
    return (await modelsCache.fetch('models')) ?? []
  } catch (error) {
    if (error instanceof GatewayError) throw error
    logger.warn('Nexora API model list unavailable', { error: getErrorMessage(error) })
    throw gatewayErrors.unavailable()
  }
}

/**
 * Maps a model name or alias (case-insensitive) to its router name. Built from the model list, or
 * resolving nothing when it cannot be read (the policy then compares exact names).
 */
export async function routerResolver(): Promise<(name: string) => string | null> {
  let models: UpstreamModel[] = []
  try {
    models = await listUpstreamModels()
  } catch {
    return () => null
  }
  const byName = new Map<string, string>()
  for (const model of models) {
    byName.set(model.id.toLowerCase(), model.id)
    for (const alias of model.aliases) {
      if (!byName.has(alias.toLowerCase())) byName.set(alias.toLowerCase(), model.id)
    }
  }
  return (name) => byName.get(name.trim().toLowerCase()) ?? null
}

/**
 * Calls Nexora API with WorkStudio's own key. A network failure becomes a 503
 * {@link GatewayError}; an HTTP error is returned as is for {@link upstreamError}.
 */
export async function callUpstream(
  path: string,
  init: { method: 'POST'; body: BodyInit; contentType?: string; signal?: AbortSignal }
): Promise<Response> {
  const config = upstreamConfig()
  try {
    // boundary-raw-fetch: Nexora API is an external service, not a same-origin route
    return await fetch(`${config.baseUrl}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        ...(init.contentType ? { 'Content-Type': init.contentType } : {}),
      },
      body: init.body,
      cache: 'no-store',
      signal: init.signal,
    })
  } catch (error) {
    if (init.signal?.aborted) throw error
    logger.warn('Nexora API unreachable', { path, error: getErrorMessage(error) })
    throw gatewayErrors.unavailable()
  }
}

function detailOf(body: unknown): string {
  if (!isRecordLike(body)) return ''
  const detail = body.detail ?? (isRecordLike(body.error) ? body.error.message : body.error)
  if (typeof detail === 'string') return detail
  return detail === undefined ? '' : JSON.stringify(detail)
}

/** Nexora API's refusal of a call, in French and in OpenAI's shape. */
export async function upstreamError(response: Response, model: string): Promise<GatewayError> {
  const body: unknown = await response.json().catch(() => null)
  const detail = detailOf(body)
  if (response.status === 404) return gatewayErrors.modelNotFound(model)
  if (response.status === 503) {
    return new GatewayError(
      503,
      'model_busy',
      `Le modèle « ${model} » est occupé ou injoignable : réessayez dans un instant.`,
      'api_error',
      { 'Retry-After': response.headers.get('Retry-After') ?? '10' }
    )
  }
  if (response.status === 422 || response.status === 400) {
    return gatewayErrors.invalidRequest(
      `Requête refusée par le modèle « ${model} »${detail ? ` : ${detail}` : ''}`,
      'invalid_request'
    )
  }
  return new GatewayError(
    response.status >= 500 ? 502 : response.status,
    'upstream_error',
    `Nexora API n’a pas pu traiter la requête (HTTP ${response.status})${detail ? ` : ${detail}` : ''}`
  )
}
