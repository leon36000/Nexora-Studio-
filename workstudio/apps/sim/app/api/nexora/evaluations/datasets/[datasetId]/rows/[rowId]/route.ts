import {
  deleteEvalRowContract,
  updateEvalRowContract,
} from '@/lib/api/contracts/nexora-evaluations'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { deleteRowUseCase, updateRowUseCase } from '@/lib/nexora/evaluations/application/use-cases'
import { presentRow } from '@/app/api/nexora/evaluations/surface'

export const dynamic = 'force-dynamic'

/** Edits a row: its question, expected answer, guidance or human annotation. */
export const PATCH = defineInternalJsonRoute({
  contract: updateEvalRowContract,
  operation: updateRowUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.evaluations.write' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ params, body }) => ({
    workspaceId: body.workspaceId,
    datasetId: params.datasetId,
    rowId: params.rowId,
    patch: body.patch,
  }),
  useCase: updateRowUseCase,
  present: ({ row }) => ({ row: presentRow(row) }),
})

/** Deletes a row. */
export const DELETE = defineInternalJsonRoute({
  contract: deleteEvalRowContract,
  operation: deleteRowUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.evaluations.write' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ params, query }) => ({
    workspaceId: query.workspaceId,
    datasetId: params.datasetId,
    rowId: params.rowId,
  }),
  useCase: deleteRowUseCase,
  present: () => ({ success: true as const }),
})
