/** An Ollama model reference: `name`, `namespace/name`, each with an optional `:tag` (lowercase). */
export const OLLAMA_MODEL_NAME =
  /^[a-z0-9][a-z0-9._-]*(\/[a-z0-9][a-z0-9._-]*)?(:[a-z0-9][a-z0-9._-]*)?$/

/**
 * A model name as Ollama lists it (`llama3.2` → `llama3.2:latest`, `Qwen2.5:7B` → `qwen2.5:7b`):
 * Nexora API checks a local model by that exact name.
 */
export function canonicalOllamaName(name: string): string {
  const lower = name.trim().toLowerCase()
  return lower.includes(':') ? lower : `${lower}:latest`
}

/** The Nexora API alias that names the deployment's default chat model. */
export const DEFAULT_MODEL_ALIAS = 'nexora-default'

/**
 * Model ids offered to blocks, from Nexora API's `/v1/models`: every router name and every alias
 * (the default model is the router carrying `nexora-default`), prefixed `vllm/`, the default alias
 * first and each id once.
 */
export function listedModelIds(models: ReadonlyArray<{ id: string; aliases?: unknown }>): string[] {
  const names: string[] = []
  for (const model of models) {
    const aliases = Array.isArray(model.aliases) ? model.aliases : []
    for (const name of [model.id, ...aliases]) {
      if (typeof name === 'string' && name.trim() && !names.includes(name)) names.push(name)
    }
  }
  const ordered = names.includes(DEFAULT_MODEL_ALIAS)
    ? [DEFAULT_MODEL_ALIAS, ...names.filter((name) => name !== DEFAULT_MODEL_ALIAS)]
    : names
  return ordered.map((name) => `vllm/${name}`)
}

/** What went wrong while the bundled Ollama downloaded a model, from its (English) message. */
export function classifyOllamaPullError(
  message: string
): 'unknownModel' | 'noSpace' | 'network' | 'other' {
  const text = message.toLowerCase()
  if (/file does not exist|not found|manifest unknown/.test(text)) return 'unknownModel'
  if (/no space left|disk full/.test(text)) return 'noSpace'
  if (/fetch failed|timeout|dial tcp|connection refused|network|interrupted/.test(text)) {
    return 'network'
  }
  return 'other'
}
