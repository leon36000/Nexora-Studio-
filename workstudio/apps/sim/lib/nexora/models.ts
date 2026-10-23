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
