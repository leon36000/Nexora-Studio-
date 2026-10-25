import {
  createEvalDatasetContract,
  listEvalDatasetsContract,
} from '@/lib/api/contracts/nexora-evaluations'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import {
  createDatasetUseCase,
  listDatasetsUseCase,
} from '@/lib/nexora/evaluations/application/use-cases'
import { presentDataset } from '@/app/api/nexora/evaluations/surface'

export const dynamic = 'force-dynamic'

/** The workspace's test sets. */
export const GET = defineInternalJsonRoute({
  contract: listEvalDatasetsContract,
  operation: listDatasetsUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.none({ reason: 'Read issued when the Evaluations page opens' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ query }) => ({ workspaceId: query.workspaceId }),
  useCase: listDatasetsUseCase,
  present: (datasets) => ({ datasets: datasets.map(presentDataset) }),
})

/** Creates a test set, empty or imported from a file, a table, traces or the member's conversations. */
export const POST = defineInternalJsonRoute({
  contract: createEvalDatasetContract,
  operation: createDatasetUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.evaluations.import' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ body }) => body,
  useCase: createDatasetUseCase,
  present: ({ dataset, skipped }) => ({ dataset: presentDataset(dataset), skipped }),
})
