import { instanceTimeZone } from '@/lib/nexora/consumption/period'
import { type GatewayError, gatewayErrors } from '@/lib/nexora/developer-api/errors'

/** The prefix of every developer API key: tells it apart from WorkStudio's own `sk-sim-` keys. */
export const NEXORA_API_KEY_PREFIX = 'sk-nexora-'

/** What the gateway knows of a key once its hash matched. */
export interface GatewayKey {
  id: string
  name: string
  scope: 'workspace' | 'instance'
  workspaceId: string | null
  /** Who created the key (gone when that account was deleted): a key never outranks its creator. */
  createdBy: string | null
  /** Nexora API model names (aliases allowed); `null` for every model. */
  allowedModels: string[] | null
  allowAgents: boolean
  monthlyTokenCap: number | null
  requestsPerMinute: number
  expiresAt: Date | null
  revokedAt: Date | null
}

/** The prefix a model name takes to call a published agent: `agent:<name or workflow id>`. */
export const AGENT_MODEL_PREFIX = 'agent:'

export function isAgentModel(model: string): boolean {
  return model.trim().toLowerCase().startsWith(AGENT_MODEL_PREFIX)
}

/** The agent a model name designates (its name or workflow id), trimmed. */
export function agentReference(model: string): string {
  return model.trim().slice(AGENT_MODEL_PREFIX.length).trim()
}

/** The Nexora key carried by an `Authorization: Bearer` header, or `null`. */
export function readBearerKey(header: string | null): string | null {
  const match = /^\s*bearer\s+(\S+)\s*$/i.exec(header ?? '')
  const value = match?.[1]
  return value?.startsWith(NEXORA_API_KEY_PREFIX) ? value : null
}

export function keyStatus(key: GatewayKey, now: Date): 'active' | 'expired' | 'revoked' {
  if (key.revokedAt) return 'revoked'
  if (key.expiresAt && key.expiresAt.getTime() <= now.getTime()) return 'expired'
  return 'active'
}

/** Why the key cannot be used now (401), or `null` when it can. Revocation wins over expiry. */
export function authenticationRefusal(
  key: GatewayKey | null,
  now: Date,
  timeZone: string = instanceTimeZone()
): GatewayError | null {
  if (!key) return gatewayErrors.invalidKey()
  const status = keyStatus(key, now)
  if (status === 'revoked') return gatewayErrors.revokedKey()
  if (status === 'expired' && key.expiresAt)
    return gatewayErrors.expiredKey(key.expiresAt, timeZone)
  return null
}

function normalizeModel(name: string): string {
  return name.trim().toLowerCase()
}

/**
 * Why the key may not call `model` (403), or `null` when it may. Names are compared as Nexora API
 * routers, so an allowed alias (`nexora-default`) allows the router it points to and the other way
 * round; `resolveRouter` maps a name or alias to its router name (`null` when unknown, or when the
 * model list cannot be read: exact names are then compared).
 */
export function modelRefusal(
  key: GatewayKey,
  model: string,
  resolveRouter: (name: string) => string | null
): GatewayError | null {
  if (key.allowedModels === null) return null
  const requested = normalizeModel(model)
  const routerOf = (name: string) => {
    const router = resolveRouter(normalizeModel(name))
    return router === null ? null : normalizeModel(router)
  }
  const requestedRouter = routerOf(requested)
  const allowed = key.allowedModels.some((entry) => {
    const name = normalizeModel(entry)
    if (name === requested) return true
    const router = routerOf(name)
    return router !== null && router === requestedRouter
  })
  return allowed ? null : gatewayErrors.modelNotAllowed(model.trim(), key.allowedModels)
}

/** Why the key may not call a published agent (403), or `null` when it may. */
export function agentRefusal(key: GatewayKey, model = 'agent'): GatewayError | null {
  if (key.scope !== 'workspace' || !key.workspaceId) return gatewayErrors.agentNeedsWorkspaceKey()
  if (!key.allowAgents) return gatewayErrors.agentsNotAllowed(model)
  return null
}

/** Why the key has used up its month (429), or `null` when it has tokens left. */
export function capRefusal(key: GatewayKey, monthTokens: number): GatewayError | null {
  if (key.monthlyTokenCap === null || monthTokens < key.monthlyTokenCap) return null
  return gatewayErrors.monthlyCapReached(key.monthlyTokenCap)
}

const CHARACTERS_PER_TOKEN = 4
/** What a call reserves for its answer when it does not say (`max_tokens`). */
const DEFAULT_ANSWER_RESERVE = 1_024
/** The most a call reserves for its answer, whatever `max_tokens` it sends. */
const MAX_ANSWER_RESERVE = 8_192

/**
 * What a call reserves of its key's month before it runs, settled afterwards with what it used:
 * its prompt at four characters a token, and its answer (`max_tokens`, bounded).
 */
export function estimateCallTokens(
  promptCharacters: number,
  maxTokens: unknown,
  { answers = true }: { answers?: boolean } = {}
): { promptTokens: number; completionTokens: number } {
  const promptTokens = Math.ceil(Math.max(0, promptCharacters) / CHARACTERS_PER_TOKEN)
  if (!answers) return { promptTokens, completionTokens: 0 }
  const asked =
    typeof maxTokens === 'number' && Number.isFinite(maxTokens) && maxTokens > 0
      ? Math.ceil(maxTokens)
      : DEFAULT_ANSWER_RESERVE
  return { promptTokens, completionTokens: Math.min(asked, MAX_ANSWER_RESERVE) }
}
