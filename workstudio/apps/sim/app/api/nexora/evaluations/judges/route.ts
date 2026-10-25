import {
  createEvalJudgeContract,
  listEvalJudgesContract,
} from '@/lib/api/contracts/nexora-evaluations'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { listJudgesUseCase, saveJudgeUseCase } from '@/lib/nexora/evaluations/application/use-cases'
import { presentJudge } from '@/app/api/nexora/evaluations/surface'

export const dynamic = 'force-dynamic'

/** The workspace's judges. */
export const GET = defineInternalJsonRoute({
  contract: listEvalJudgesContract,
  operation: listJudgesUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.none({ reason: 'Read issued when the Evaluations page opens' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ query }) => ({ workspaceId: query.workspaceId }),
  useCase: listJudgesUseCase,
  present: (judges) => ({ judges: judges.map(presentJudge) }),
})

/** Saves a new judge. */
export const POST = defineInternalJsonRoute({
  contract: createEvalJudgeContract,
  operation: saveJudgeUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.evaluations.write' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ body }) => body,
  useCase: saveJudgeUseCase,
  present: (judge) => ({ judge: presentJudge(judge) }),
})
