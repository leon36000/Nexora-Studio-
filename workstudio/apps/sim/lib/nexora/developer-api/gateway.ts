import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { RateLimiter } from '@/lib/core/rate-limiter'
import { checkBudget } from '@/lib/nexora/consumption/budgets'
import { GatewayError, gatewayErrors } from '@/lib/nexora/developer-api/errors'
import { keyModelConfig } from '@/lib/nexora/developer-api/key-model-policy'
import { keyModelRefusal } from '@/lib/nexora/developer-api/model-gate'
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
  reserveNexoraApiKeyTokens,
  settleNexoraApiKeyTokens,
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

/** What a call used, to settle its reservation. */
export interface CallUsage {
  promptTokens: number
  completionTokens: number
}

/**
 * A call's reservation of its key's month: settled once with what it used, or released when the
 * call never reached a model. Further calls are no-ops; a failed write is logged, never surfaced.
 */
export interface SpendingReservation {
  readonly estimate: CallUsage
  settle(usage: CallUsage): Promise<void>
  release(): Promise<void>
}

/**
 * Admits a call that may spend tokens and reserves its estimate under `model` (the name its usage
 * is recorded under): the key's monthly cap, atomically, then the budgets of its workspace and of
 * the instance (a workspace key; an instance key answers to its own cap). Throws when refused.
 * Budgets are read from a short cache, so concurrent calls can go slightly past one.
 */
export async function reserveSpending(
  key: GatewayKey,
  model: string,
  estimate: CallUsage
): Promise<SpendingReservation> {
  const outcome = await reserveNexoraApiKeyTokens({
    keyId: key.id,
    model,
    tokens: estimate.promptTokens + estimate.completionTokens,
    monthlyTokenCap: key.monthlyTokenCap,
  })
  if (!outcome.admitted) {
    throw capRefusal(key, outcome.monthTokens) ?? gatewayErrors.monthlyCapReached(0)
  }
  const { handle } = outcome
  let done = false
  const finish = async (usage: CallUsage | null) => {
    if (done) return
    done = true
    try {
      await settleNexoraApiKeyTokens(
        usage ? { ...handle, ...usage } : { ...handle, released: true }
      )
    } catch (error) {
      logger.error('Could not settle a developer API call', {
        keyId: key.id,
        model,
        error: getErrorMessage(error),
      })
    }
  }
  const reservation: SpendingReservation = {
    estimate,
    settle: (usage) => finish(usage),
    release: () => finish(null),
  }
  if (key.scope === 'workspace' && key.workspaceId) {
    const budget = await checkBudget(key.workspaceId, null)
    if (!budget.allowed) {
      await reservation.release()
      throw gatewayErrors.budgetReached(budget.message)
    }
  }
  return reservation
}

/**
 * Throws a 403 when the key may not call `model`: its own model list, then the access group that
 * governs it (its creator's, so a later restriction applies to keys already created). Returns the
 * name the call's usage is recorded under: the router behind an alias, or the name as sent.
 */
export async function admitModel(key: GatewayKey, model: string): Promise<string> {
  const [resolve, config] = await Promise.all([routerResolver(), keyModelConfig(key)])
  const refusal = modelRefusal(key, model, resolve) ?? keyModelRefusal(config, model, resolve)
  if (refusal) throw refusal
  return resolve(model) ?? model.trim()
}
