import { env } from '@/lib/core/config/env'
import { DEFAULT_MODEL_ALIAS } from '@/lib/nexora/model-ids'

const VLLM_PREFIX = /^vllm\//i

/**
 * Nexora edition: the address of the site's model gateway (`NEXORA_GATEWAY_URL`, OpenAI-compatible,
 * ending in `/v1`), `null` when this instance keeps its own Nexora API for everything.
 */
export function nexoraGatewayUrl(): string | null {
  return env.NEXORA_GATEWAY_URL?.trim().replace(/\/+$/, '') || null
}

function trimTrailingSlashes(path: string): string {
  return path.replace(/\/+$/, '')
}

/**
 * Whether `candidate` is the gateway's own address: same scheme, host, port and path, nothing
 * else. Anything the operator did not name stays subject to the usual outgoing-address checks.
 */
export function isNexoraGatewayEndpoint(
  candidate: string,
  gatewayUrl: string | null = nexoraGatewayUrl()
): boolean {
  if (!gatewayUrl) return false
  try {
    const url = new URL(candidate)
    const gateway = new URL(gatewayUrl)
    return (
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.origin === gateway.origin &&
      trimTrailingSlashes(url.pathname) === trimTrailingSlashes(gateway.pathname)
    )
  } catch {
    return false
  }
}

/**
 * The model a request asks the gateway for: `nexora-default` (with or without the `vllm/` prefix)
 * stands for the model the gateway gave the person as theirs; any other model is the person's choice.
 */
export function gatewayModelName(model: string, defaultModel: string): string {
  const prefixed = VLLM_PREFIX.test(model)
  const name = prefixed ? model.replace(VLLM_PREFIX, '') : model
  if (name.toLowerCase() !== DEFAULT_MODEL_ALIAS) return model
  return prefixed ? `vllm/${defaultModel}` : defaultModel
}
