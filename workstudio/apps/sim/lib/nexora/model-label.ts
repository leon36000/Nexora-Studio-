import { DEFAULT_MODEL_ALIAS } from '@/lib/nexora/model-ids'

const PROVIDER_PREFIX = 'vllm/'

/** The model a block uses when nobody picked one: the `nexora-default` alias, which follows the instance default. */
export function isDefaultModelValue(value: string): boolean {
  return value === DEFAULT_MODEL_ALIAS || value === `${PROVIDER_PREFIX}${DEFAULT_MODEL_ALIAS}`
}

/** A model name without the technical provider prefix the router adds (`vllm/`). */
export function plainModelName(value: string): string {
  return value.startsWith(PROVIDER_PREFIX) ? value.slice(PROVIDER_PREFIX.length) : value
}
