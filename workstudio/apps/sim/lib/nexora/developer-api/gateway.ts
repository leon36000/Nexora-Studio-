import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { RateLimiter } from '@/lib/core/rate-limiter'
import { checkBudget } from '@/lib/nexora/consumption/budgets'
import { GatewayError, gatewayErrors } from '@/lib/nexora/developer-api/errors'
import {
  authenticationRefusal,
  capRefusal,
  type GatewayKey,
  modelRefusal,
  readBearerKey,
} from '@/lib/nexora/developer-api/policy'
import {
  findNexoraApiKeyByHash,
  hashNexoraApiKey,
  monthTokensOfKey,
  recordNexoraApiKeyUsage,
  touchNexoraApiKey,
} from '@/lib/nexora/developer-api/repository'
import { routerResolver } from '@/lib/nexora/developer-api/upstream'

const logger = createLogger('NexoraDeveloperApi')

const rateLimiter = new RateLimiter()
const MINUTE_MS = 60_000

/** An authenticated call: its key and the rate-limit headers every answer carries. */
export interface GatewayCall {
  key: GatewayKey
  headers: Record<string, string>
}

/**
 * Authenticates a developer API call (`Authorization: Bearer sk-nexora-…`) and spends one request
 * of the key's per-minute budget. Throws a {@link GatewayError} (401, 429) when refused.
 */
export async function authenticateGatewayCall(request: Request): Promise<GatewayCall> {
  const value = readBearerKey(request.headers.get('authorization'))
  const key = value ? await findNexoraApiKeyByHash(hashNexoraApiKey(value)) : null
  const refusal = authenticationRefusal(key, new Date())
  if (refusal || !key) throw refusal ?? gatewayErrors.invalidKey()

  const limit = key.requestsPerMinute
  const result = await rateLimiter.checkRateLimitDirect(`nexora-api-key:${key.id}`, {
    maxTokens: limit,
    refillRate: limit,
    refillIntervalMs: MINUTE_MS,
  })
  const resetSeconds = Math.max(1, Math.ceil((result.resetAt.getTime() - Date.now()) / 1000))
  const headers = {
    'x-ratelimit-limit-requests': String(limit),
    'x-ratelimit-remaining-requests': String(Math.max(0, result.remaining)),
    'x-ratelimit-reset-requests': `${resetSeconds}s`,
  }
  if (!result.allowed) {
    const error = gatewayErrors.rateLimited(limit, resetSeconds)
    throw new GatewayError(error.status, error.code, error.message, error.type, {
      ...headers,
      ...error.headers,
    })
  }
  void touchNexoraApiKey(key.id)
  return { key, headers }
}

/**
 * Whether the key may spend tokens now: its monthly cap, then the budgets of its workspace and of
 * the instance (a workspace key; an instance key answers to its own cap). Throws when refused.
 */
export async function admitSpending(key: GatewayKey): Promise<void> {
  const capped = capRefusal(key, key.monthlyTokenCap === null ? 0 : await monthTokensOfKey(key.id))
  if (capped) throw capped
  if (key.scope === 'workspace' && key.workspaceId) {
    const budget = await checkBudget(key.workspaceId, null)
    if (!budget.allowed) throw gatewayErrors.budgetReached(budget.message)
  }
}

/** Throws a 403 when the key may not call `model`. */
export async function admitModel(key: GatewayKey, model: string): Promise<void> {
  if (key.allowedModels === null) return
  const refusal = modelRefusal(key, model, await routerResolver())
  if (refusal) throw refusal
}

/** Records one call in the key's usage; a failed write is logged, never surfaced to the caller. */
export async function recordUsage(
  key: GatewayKey,
  model: string,
  promptTokens: number,
  completionTokens: number
): Promise<void> {
  try {
    await recordNexoraApiKeyUsage({ keyId: key.id, model, promptTokens, completionTokens })
  } catch (error) {
    logger.error('Could not record a developer API call', {
      keyId: key.id,
      model,
      error: getErrorMessage(error),
    })
  }
}
