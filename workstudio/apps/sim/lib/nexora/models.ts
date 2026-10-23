import type { NexoraModelUsage } from '@/lib/nexora/model-ids'
import { pickNexoraDefaultModel } from '@/providers/nexora'

/**
 * Nexora edition: blocks whose `model` field asks for a chat model. New blocks of these types
 * start on the deployment's default model (the Nexora API alias) instead of the upstream
 * default, which is hidden when only Nexora models are offered. The Pi coding agent is left
 * out: it runs in a remote sandbox with its own model list.
 */
export const MODEL_DEFAULT_BLOCK_TYPES: readonly string[] = [
  'agent',
  'router',
  'router_v2',
  'evaluator',
  'guardrails',
]

/**
 * Nexora edition: blocks with a « Nexora » provider (a vision, OCR or transcription model served by
 * Nexora API, no key to enter), and the model usage that provider needs. New blocks of these types
 * start on it.
 */
const NEXORA_PROVIDER_USAGE: Readonly<Record<string, NexoraModelUsage>> = {
  vision_v2: 'vision',
  mistral_parse_v3: 'vision',
  stt: 'transcription',
  stt_v2: 'transcription',
}

/** The model usage a block's « Nexora » provider needs, `null` for a block without one. */
export function nexoraProviderUsage(blockType: string): NexoraModelUsage | null {
  return Object.hasOwn(NEXORA_PROVIDER_USAGE, blockType) ? NEXORA_PROVIDER_USAGE[blockType] : null
}

/** The sub-block naming the Nexora model of a block's « Nexora » provider (empty: the first one). */
export const NEXORA_MODEL_SUBBLOCK_ID = 'nexoraModel'

/** The `provider` value of a block's « Nexora » option. */
export const NEXORA_BLOCK_PROVIDER = 'nexora'

/**
 * Whether a new block's sub-block starts on the « Nexora » provider: only in the Nexora edition,
 * recognized by its default chat model being served by Nexora API (`vllm/…`).
 */
export function receivesNexoraProvider(
  blockType: string,
  subBlockId: string,
  defaultChatModel: string | null | undefined
): boolean {
  return (
    subBlockId === 'provider' &&
    nexoraProviderUsage(blockType) !== null &&
    pickNexoraDefaultModel(defaultChatModel ? [defaultChatModel] : []) !== null
  )
}

/** Whether a new block's sub-block is seeded with the deployment's default chat model. */
export function receivesDefaultModel(blockType: string, subBlockId: string): boolean {
  return subBlockId === 'model' && MODEL_DEFAULT_BLOCK_TYPES.includes(blockType)
}

/**
 * The Nexora model to offer when a block's stored model is not served by this instance (for
 * example a workflow imported from elsewhere): `null` when there is nothing to signal — usable
 * value, empty field, `<block.output>` reference, model list not loaded, or no Nexora model.
 */
export function unavailableModelReplacement(
  subBlockId: string,
  value: unknown,
  usableModelIds: readonly string[]
): string | null {
  if (subBlockId !== 'model' || typeof value !== 'string' || !value.trim()) return null
  if (value.trim().startsWith('<') || usableModelIds.includes(value)) return null
  return pickNexoraDefaultModel(usableModelIds)
}
