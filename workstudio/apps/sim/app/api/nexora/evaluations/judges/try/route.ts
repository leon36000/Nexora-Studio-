import { tryEvalJudgeContract } from '@/lib/api/contracts/nexora-evaluations'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { tryJudgeUseCase } from '@/lib/nexora/evaluations/application/use-cases'

export const dynamic = 'force-dynamic'

/** « Essayer » : a judge on up to 10 rows of a test set, with its agreement with the human verdicts. */
export const POST = defineInternalJsonRoute({
  contract: tryEvalJudgeContract,
  operation: tryJudgeUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.evaluations.try' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ body }) => body,
  useCase: tryJudgeUseCase,
  present: (result) => result,
})
