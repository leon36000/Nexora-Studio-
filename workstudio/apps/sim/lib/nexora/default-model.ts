import { toRecord } from '@sim/utils/object'
import { env } from '@/lib/core/config/env'
import { DEFAULT_MODEL_ALIAS, type NexoraModelUsages, servedUsages } from '@/lib/nexora/model-ids'

interface ModelStatusOptions {
  /** OpenAI-compatible base URL, ending in `/v1`, and WorkStudio's model key. */
  config?: { baseUrl: string; apiKey: string }
  fetchFn?: typeof fetch
}

interface ModelStatus {
  /** Name of the model every `nexora-default` request goes to, `null` without one. */
  defaultModel: string | null
  /** Which usages have at least one model, `null` when Nexora API does not answer. */
  usages: NexoraModelUsages | null
}

const UNKNOWN: ModelStatus = { defaultModel: null, usages: null }

/**
 * The default model's name and which model usages this instance serves, read from one `/models`
 * call with WorkStudio's own model key (no admin right needed, no provider detail). Unknown when
 * Nexora API does not answer: the home page shows the model as unavailable instead of failing.
 */
export async function fetchModelStatus(options: ModelStatusOptions = {}): Promise<ModelStatus> {
  const config = options.config ?? {
    baseUrl: (env.VLLM_BASE_URL ?? '').trim().replace(/\/+$/, ''),
    apiKey: env.VLLM_API_KEY?.trim() ?? '',
  }
  if (!config.baseUrl) return UNKNOWN
  try {
    // boundary-raw-fetch: Nexora API is a separate service, not a same-origin route
    const response = await (options.fetchFn ?? fetch)(`${config.baseUrl}/models`, {
      headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {},
      signal: AbortSignal.timeout(5_000),
    })
    if (!response.ok) return UNKNOWN
    const listed = toRecord(await response.json()).data
    if (!Array.isArray(listed)) return UNKNOWN
    const models = listed.flatMap((item) => {
      const model = toRecord(item)
      return typeof model.id === 'string'
        ? [{ id: model.id, type: model.type, aliases: model.aliases }]
        : []
    })
    const holder = models.find(
      (model) => Array.isArray(model.aliases) && model.aliases.includes(DEFAULT_MODEL_ALIAS)
    )
    return { defaultModel: holder?.id ?? null, usages: servedUsages(models) }
  } catch {
    return UNKNOWN
  }
}
