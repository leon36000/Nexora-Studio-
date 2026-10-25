import {
  deleteEvalDatasetContract,
  getEvalDatasetContract,
} from '@/lib/api/contracts/nexora-evaluations'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import {
  deleteDatasetUseCase,
  readDatasetUseCase,
} from '@/lib/nexora/evaluations/application/use-cases'
import { presentDataset, presentRow } from '@/app/api/nexora/evaluations/surface'

export const dynamic = 'force-dynamic'

/** A test set with a page of its rows. */
export const GET = defineInternalJsonRoute({
  contract: getEvalDatasetContract,
  operation: readDatasetUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.none({ reason: 'Read issued when the Evaluations page opens' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ params, query }) => ({ ...query, datasetId: params.datasetId }),
  useCase: readDatasetUseCase,
  present: ({ dataset, rows }) => ({
    dataset: presentDataset(dataset),
    rows: rows.map(presentRow),
  }),
})

/** Deletes a test set no campaign or schedule uses. */
export const DELETE = defineInternalJsonRoute({
  contract: deleteEvalDatasetContract,
  operation: deleteDatasetUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.evaluations.write' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ params, query }) => ({
    workspaceId: query.workspaceId,
    datasetId: params.datasetId,
  }),
  useCase: deleteDatasetUseCase,
  present: () => ({ success: true as const }),
})
