import { env } from '@/lib/core/config/env'
import { DEFAULT_MODEL_ALIAS } from '@/lib/nexora/model-ids'

interface DefaultModelOptions {
  /** OpenAI-compatible base URL, ending in `/v1`, and WorkStudio's model key. */
  config?: { baseUrl: string; apiKey: string }
  fetchFn?: typeof fetch
}

/**
 * Name of the model every `nexora-default` request goes to, read with WorkStudio's own model key
 * (no admin right needed). `null` when Nexora API does not answer: the home page shows the model
 * as unavailable instead of failing.
 */
export async function fetchDefaultModelName(
  options: DefaultModelOptions = {}
): Promise<string | null> {
  const config = options.config ?? {
    baseUrl: (env.VLLM_BASE_URL ?? '').trim().replace(/\/+$/, ''),
    apiKey: env.VLLM_API_KEY?.trim() ?? '',
  }
  if (!config.baseUrl) return null
  try {
    // boundary-raw-fetch: Nexora API is a separate service, not a same-origin route
    const response = await (options.fetchFn ?? fetch)(`${config.baseUrl}/models`, {
      headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {},
      signal: AbortSignal.timeout(5_000),
    })
    if (!response.ok) return null
    const body = (await response.json()) as { data?: { id: string; aliases?: unknown }[] }
    const holder = body.data?.find(
      (model) => Array.isArray(model.aliases) && model.aliases.includes(DEFAULT_MODEL_ALIAS)
    )
    return holder?.id ?? null
  } catch {
    return null
  }
}
