import {
  createEvalScheduleContract,
  listEvalSchedulesContract,
} from '@/lib/api/contracts/nexora-evaluations'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import {
  listSchedulesUseCase,
  saveScheduleUseCase,
} from '@/lib/nexora/evaluations/application/use-cases'
import { presentSchedule } from '@/app/api/nexora/evaluations/surface'

export const dynamic = 'force-dynamic'

/** The workspace's scheduled campaigns. */
export const GET = defineInternalJsonRoute({
  contract: listEvalSchedulesContract,
  operation: listSchedulesUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.none({ reason: 'Read issued when the Evaluations page opens' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ query }) => ({ workspaceId: query.workspaceId }),
  useCase: listSchedulesUseCase,
  present: (schedules) => ({ schedules: schedules.map(presentSchedule) }),
})

/** Schedules a campaign. */
export const POST = defineInternalJsonRoute({
  contract: createEvalScheduleContract,
  operation: saveScheduleUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.evaluations.write' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ body }) => body,
  useCase: saveScheduleUseCase,
  present: (schedule) => ({ schedule: presentSchedule(schedule) }),
})
