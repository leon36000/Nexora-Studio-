import { getWorkspaceTraceContract } from '@/lib/api/contracts/nexora-traces'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { getWorkspaceTrace } from '@/lib/nexora/traces/application/use-cases'
import { presentSpan, presentTrace } from '@/app/api/nexora/traces/surface'

export const dynamic = 'force-dynamic'

/** One trace with its spans; a trace the reader may not read answers 404, like a missing one. */
export const GET = defineInternalJsonRoute({
  contract: getWorkspaceTraceContract,
  operation: getWorkspaceTrace.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.none({ reason: 'Read-only detail panel' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ params, query }) => ({ workspaceId: query.workspaceId, traceId: params.traceId }),
  useCase: getWorkspaceTrace,
  present: ({ trace, spans }) => ({ trace: presentTrace(trace), spans: spans.map(presentSpan) }),
})
