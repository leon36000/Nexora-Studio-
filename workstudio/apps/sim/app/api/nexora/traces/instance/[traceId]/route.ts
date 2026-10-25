import { getInstanceTraceContract } from '@/lib/api/contracts/nexora-traces'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { getInstanceTrace } from '@/lib/nexora/traces/application/use-cases'
import { presentSpan, presentTrace } from '@/app/api/nexora/traces/surface'
import {
  instanceOrganizationInput,
  requireInstanceAdmin,
} from '@/app/api/nexora/consumption/surface'

export const dynamic = 'force-dynamic'

/** One trace of no workspace, with its spans. Instance owners and admins. */
export const GET = defineInternalJsonRoute({
  contract: getInstanceTraceContract,
  operation: getInstanceTrace.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.none({ reason: 'Instance-admin read-only detail panel' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  beforeParse: requireInstanceAdmin,
  mapInput: async ({ params }) => ({ ...(await instanceOrganizationInput()), traceId: params.traceId }),
  useCase: getInstanceTrace,
  present: ({ trace, spans }) => ({ trace: presentTrace(trace), spans: spans.map(presentSpan) }),
})
