import {
  deleteEvalScheduleContract,
  updateEvalScheduleContract,
} from '@/lib/api/contracts/nexora-evaluations'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import {
  deleteScheduleUseCase,
  saveScheduleUseCase,
} from '@/lib/nexora/evaluations/application/use-cases'
import { presentSchedule } from '@/app/api/nexora/evaluations/surface'

export const dynamic = 'force-dynamic'

/** Replaces a schedule. */
export const PUT = defineInternalJsonRoute({
  contract: updateEvalScheduleContract,
  operation: saveScheduleUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.evaluations.write' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ params, body }) => ({ ...body, scheduleId: params.scheduleId }),
  useCase: saveScheduleUseCase,
  present: (schedule) => ({ schedule: presentSchedule(schedule) }),
})

/** Deletes a schedule. */
export const DELETE = defineInternalJsonRoute({
  contract: deleteEvalScheduleContract,
  operation: deleteScheduleUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.evaluations.write' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ params, query }) => ({
    workspaceId: query.workspaceId,
    scheduleId: params.scheduleId,
  }),
  useCase: deleteScheduleUseCase,
  present: () => ({ success: true as const }),
})
