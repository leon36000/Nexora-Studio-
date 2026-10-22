/**
 * Nexora edition: models are served by Nexora API, reached through the OpenAI-compatible
 * `vllm` provider (its id is kept so saved workflows stay valid; it is shown as "Nexora").
 */
export const NEXORA_MODEL_PROVIDER = 'vllm'

/**
 * Providers to hide: the configured blacklist, plus every provider other than Nexora API
 * when `NEXORA_ONLY_MODELS` is on. Nexora API itself is never hidden in that mode.
 */
export function effectiveBlacklistedProviders(
  allProviderIds: readonly string[],
  configured: readonly string[],
  nexoraOnly: boolean
): string[] {
  const hidden = new Set(configured.map((id) => id.toLowerCase()))
  if (nexoraOnly) {
    for (const id of allProviderIds) hidden.add(id.toLowerCase())
    hidden.delete(NEXORA_MODEL_PROVIDER)
  }
  return [...hidden]
}

/** The model new Agent blocks start with: the first one Nexora API serves. */
export function pickNexoraDefaultModel(models: readonly string[]): string | null {
  return models.find((model) => model.startsWith(`${NEXORA_MODEL_PROVIDER}/`)) ?? null
}
