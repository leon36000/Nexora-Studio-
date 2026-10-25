import {
  deleteEvalJudgeContract,
  updateEvalJudgeContract,
} from '@/lib/api/contracts/nexora-evaluations'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import {
  deleteJudgeUseCase,
  saveJudgeUseCase,
} from '@/lib/nexora/evaluations/application/use-cases'
import { presentJudge } from '@/app/api/nexora/evaluations/surface'

export const dynamic = 'force-dynamic'

/** Replaces a judge's name and settings. */
export const PUT = defineInternalJsonRoute({
  contract: updateEvalJudgeContract,
  operation: saveJudgeUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.evaluations.write' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ params, body }) => ({ ...body, judgeId: params.judgeId }),
  useCase: saveJudgeUseCase,
  present: (judge) => ({ judge: presentJudge(judge) }),
})

/** Deletes a judge no campaign or schedule uses. */
export const DELETE = defineInternalJsonRoute({
  contract: deleteEvalJudgeContract,
  operation: deleteJudgeUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.evaluations.write' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ params, query }) => ({ workspaceId: query.workspaceId, judgeId: params.judgeId }),
  useCase: deleteJudgeUseCase,
  present: () => ({ success: true as const }),
})
