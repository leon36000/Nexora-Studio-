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
 * What a model is used for (Réglages › Modèles): chatting (Agent and the other chat blocks),
 * reading images and documents (Vision, OCR), or transcribing speech. Each usage is a Nexora API
 * router type.
 */
export const NEXORA_MODEL_USAGES = ['chat', 'vision', 'transcription'] as const
export type NexoraModelUsage = (typeof NEXORA_MODEL_USAGES)[number]

export const ROUTER_TYPE_BY_USAGE: Record<NexoraModelUsage, string> = {
  chat: 'text-generation',
  vision: 'image-to-text',
  transcription: 'automatic-speech-recognition',
}

/** The usage a Nexora API router type serves, `null` for the types WorkStudio does not manage. */
export function usageOfRouterType(type: string): NexoraModelUsage | null {
  return NEXORA_MODEL_USAGES.find((usage) => ROUTER_TYPE_BY_USAGE[usage] === type) ?? null
}

interface ServedModel {
  id: string
  type?: unknown
  aliases?: unknown
}

function namesOf(models: ReadonlyArray<ServedModel>): string[] {
  const names: string[] = []
  for (const model of models) {
    const aliases = Array.isArray(model.aliases) ? model.aliases : []
    for (const name of [model.id, ...aliases]) {
      if (typeof name === 'string' && name.trim() && !names.includes(name)) names.push(name)
    }
  }
  return names
}

/** Names (and aliases) of the models Nexora API's `/v1/models` serves for one usage. */
export function modelNamesOfUsage(
  models: ReadonlyArray<ServedModel>,
  usage: NexoraModelUsage
): string[] {
  return namesOf(models.filter((model) => model.type === ROUTER_TYPE_BY_USAGE[usage]))
}

/** Whether each usage has at least one model on this instance. */
export type NexoraModelUsages = Record<NexoraModelUsage, boolean>

/**
 * Which usages have at least one model, from Nexora API's `/v1/models` (WorkStudio's own key, no
 * admin right). An untyped entry counts as a chat model, as in {@link listedModelIds}.
 */
export function servedUsages(models: ReadonlyArray<ServedModel>): NexoraModelUsages {
  const served = (usage: NexoraModelUsage) =>
    models.some(
      (model) =>
        model.type === ROUTER_TYPE_BY_USAGE[usage] || (usage === 'chat' && model.type === undefined)
    )
  return { chat: served('chat'), vision: served('vision'), transcription: served('transcription') }
}

/**
 * Model ids offered to the chat blocks, from Nexora API's `/v1/models`: every chat router name and
 * every alias (the default model is the router carrying `nexora-default`), prefixed `vllm/`, the
 * default alias first and each id once. Vision and transcription models are left out; an entry
 * without a type is kept.
 */
export function listedModelIds(models: ReadonlyArray<ServedModel>): string[] {
  const names = namesOf(
    models.filter((model) => model.type === undefined || model.type === ROUTER_TYPE_BY_USAGE.chat)
  )
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
