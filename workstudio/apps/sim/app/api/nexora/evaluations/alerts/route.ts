import { listEvalAlertsContract } from '@/lib/api/contracts/nexora-evaluations'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { listAlertsUseCase } from '@/lib/nexora/evaluations/application/use-cases'
import { presentAlert } from '@/app/api/nexora/evaluations/surface'

export const dynamic = 'force-dynamic'

/** Open alerts: targets under their threshold. */
export const GET = defineInternalJsonRoute({
  contract: listEvalAlertsContract,
  operation: listAlertsUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.none({ reason: 'Read issued when the Evaluations page opens' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ query }) => ({ workspaceId: query.workspaceId }),
  useCase: listAlertsUseCase,
  present: (alerts) => ({ alerts: alerts.map(presentAlert) }),
})
