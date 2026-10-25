import { testTraceExportContract } from '@/lib/api/contracts/nexora-traces'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { testTraceExport } from '@/lib/nexora/traces/application/use-cases'
import {
  instanceOrganizationInput,
  requireInstanceAdmin,
} from '@/app/api/nexora/consumption/surface'

export const dynamic = 'force-dynamic'

/** Sends one test span to the collector as saved. Instance owners and admins. */
export const POST = defineInternalJsonRoute({
  contract: testTraceExportContract,
  operation: testTraceExport.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.traces.settings' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  beforeParse: requireInstanceAdmin,
  mapInput: () => instanceOrganizationInput(),
  useCase: testTraceExport,
  present: (result) => result,
})
