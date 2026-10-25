import { appendEvalRowsContract } from '@/lib/api/contracts/nexora-evaluations'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { appendRowsUseCase } from '@/lib/nexora/evaluations/application/use-cases'
import { toRowDraft } from '@/app/api/nexora/evaluations/surface'

export const dynamic = 'force-dynamic'

/** Adds rows to a test set. */
export const POST = defineInternalJsonRoute({
  contract: appendEvalRowsContract,
  operation: appendRowsUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.evaluations.write' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ params, body }) => ({
    workspaceId: body.workspaceId,
    datasetId: params.datasetId,
    rows: body.rows.map(toRowDraft),
  }),
  useCase: appendRowsUseCase,
  present: ({ added }) => ({ added }),
})
