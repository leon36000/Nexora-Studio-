import { listWorkspaceTraceFacetsContract } from '@/lib/api/contracts/nexora-traces'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { listWorkspaceTraceFacets } from '@/lib/nexora/traces/application/use-cases'

export const dynamic = 'force-dynamic'

/** The agents, models, keys and sources the Traces filters offer for this reader. */
export const GET = defineInternalJsonRoute({
  contract: listWorkspaceTraceFacetsContract,
  operation: listWorkspaceTraceFacets.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.none({ reason: 'Read-only filter values' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ query }) => ({ workspaceId: query.workspaceId }),
  useCase: listWorkspaceTraceFacets,
  present: (facets) => facets,
})
