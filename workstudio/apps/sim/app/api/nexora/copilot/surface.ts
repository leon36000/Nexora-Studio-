import {
  extendInternalErrorPolicy,
  internalErrorResponse,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
} from '@/lib/api/server/routes'
import { CopilotGenerationError, CopilotPlanError } from '@/lib/nexora/copilot'

/**
 * The Copilot routes' errors carry the `code` the page branches on: a plan that stays invalid
 * (or a submitted plan that cannot compile) is a 422 `plan-invalid` whose `error` says why in
 * French; a request the model refused is a 422 `rejected` with its reason; an unreachable model is
 * a 503 `unavailable`. Everything else follows the orchestration
 * classes (no write access is a 403, a folder outside the workspace a 404).
 */
export const copilotErrorPolicy = extendInternalErrorPolicy(
  internalOrchestrationErrorPolicy,
  (error) => {
    if (error instanceof CopilotGenerationError) {
      return internalErrorResponse(error.code === 'unavailable' ? 503 : 422, {
        error: error.detail,
        code: error.code,
      })
    }
    if (error instanceof CopilotPlanError) {
      return internalErrorResponse(422, { error: error.detail, code: 'plan-invalid' })
    }
    return null
  }
)

/** Each plan is up to two model calls: a few per minute per member is plenty for a person. */
export const copilotRateLimit = internalRateLimits.user({
  bucketName: 'nexora.copilot',
  config: { maxTokens: 10, refillRate: 10, refillIntervalMs: 60_000 },
})
