import { purgeTracesContract } from '@/lib/api/contracts/nexora-traces'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { purgeNexoraTraces } from '@/lib/nexora/traces/application/use-cases'
import {
  instanceOrganizationInput,
  requireInstanceAdmin,
} from '@/app/api/nexora/consumption/surface'

export const dynamic = 'force-dynamic'

/** « Purge now »: deletes the traces older than the retention. Instance owners and admins. */
export const POST = defineInternalJsonRoute({
  contract: purgeTracesContract,
  operation: purgeNexoraTraces.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.traces.settings' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  beforeParse: requireInstanceAdmin,
  mapInput: async ({ body }) => ({
    ...(await instanceOrganizationInput()),
    workspaceId: body.workspaceId,
    asOf: body.asOf ? new Date(body.asOf) : undefined,
  }),
  useCase: purgeNexoraTraces,
  present: (result) => result,
})
