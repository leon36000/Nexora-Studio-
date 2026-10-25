import { listInstanceTracesContract } from '@/lib/api/contracts/nexora-traces'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { listInstanceTraces } from '@/lib/nexora/traces/application/use-cases'
import {
  instanceOrganizationInput,
  requireInstanceAdmin,
} from '@/app/api/nexora/consumption/surface'
import { presentTrace, toFilters } from '@/app/api/nexora/traces/surface'

export const dynamic = 'force-dynamic'

/** Traces of no workspace (calls by instance keys). Instance owners and admins. */
export const GET = defineInternalJsonRoute({
  contract: listInstanceTracesContract,
  operation: listInstanceTraces.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.none({ reason: 'Instance-admin read-only screen' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  beforeParse: requireInstanceAdmin,
  mapInput: async ({ query }) => ({
    ...(await instanceOrganizationInput()),
    filters: toFilters(query),
  }),
  useCase: listInstanceTraces,
  present: ({ traces, nextCursor }) => ({ traces: traces.map(presentTrace), nextCursor }),
})
