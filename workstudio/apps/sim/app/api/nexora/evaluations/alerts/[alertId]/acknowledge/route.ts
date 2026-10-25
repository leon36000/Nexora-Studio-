import { acknowledgeEvalAlertContract } from '@/lib/api/contracts/nexora-evaluations'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { acknowledgeAlertUseCase } from '@/lib/nexora/evaluations/application/use-cases'

export const dynamic = 'force-dynamic'

/** Acknowledges an alert. */
export const POST = defineInternalJsonRoute({
  contract: acknowledgeEvalAlertContract,
  operation: acknowledgeAlertUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.evaluations.write' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ params, body }) => ({ workspaceId: body.workspaceId, alertId: params.alertId }),
  useCase: acknowledgeAlertUseCase,
  present: () => ({ success: true as const }),
})
