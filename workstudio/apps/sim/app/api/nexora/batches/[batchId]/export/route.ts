import { exportBatchContract } from '@/lib/api/contracts/nexora-batches'
import {
  defineInternalBinaryRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { exportBatchUseCase } from '@/lib/nexora/batches/application/use-cases'

export const dynamic = 'force-dynamic'

/** The batch's results as a CSV a French spreadsheet opens (streamed page by page). */
export const GET = defineInternalBinaryRoute({
  contract: exportBatchContract,
  operation: exportBatchUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.none({ reason: 'CSV download of a batch the member can read' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ params, query }) => ({ workspaceId: query.workspaceId, batchId: params.batchId }),
  useCase: exportBatchUseCase,
  present: ({ filename, stream }) => ({
    body: stream,
    contentType: 'text/csv; charset=utf-8',
    contentDisposition: `attachment; filename="${filename}"`,
    headers: { 'Cache-Control': 'no-store' },
  }),
})
