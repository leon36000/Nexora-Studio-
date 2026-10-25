import { listWorkspaceTracesContract } from '@/lib/api/contracts/nexora-traces'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { listWorkspaceTraces } from '@/lib/nexora/traces/application/use-cases'
import { presentTrace, toFilters } from '@/app/api/nexora/traces/surface'

export const dynamic = 'force-dynamic'

/** The Traces screen: a workspace's traces as the reader may see them, filtered and paged. */
export const GET = defineInternalJsonRoute({
  contract: listWorkspaceTracesContract,
  operation: listWorkspaceTraces.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.none({ reason: 'Read-only screen, filters re-query as typed' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ query }) => {
    const { workspaceId, ...filters } = query
    return { workspaceId, filters: toFilters(filters) }
  },
  useCase: listWorkspaceTraces,
  present: ({ traces, nextCursor }) => ({ traces: traces.map(presentTrace), nextCursor }),
})
