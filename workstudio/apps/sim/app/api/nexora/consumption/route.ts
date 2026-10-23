import { getNexoraConsumptionContract } from '@/lib/api/contracts/nexora-consumption'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { readNexoraConsumption } from '@/lib/nexora/consumption/application/use-cases'
import {
  instanceOrganizationInput,
  requireInstanceAdmin,
} from '@/app/api/nexora/consumption/surface'

export const dynamic = 'force-dynamic'

/** Réglages › Consommation: the instance's consumption over 7, 30 or 90 days. */
export const GET = defineInternalJsonRoute({
  contract: getNexoraConsumptionContract,
  operation: readNexoraConsumption.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.none({
    reason: 'Instance-admin settings read, issued once per period change from the settings page',
  }),
  errorPolicy: internalOrchestrationErrorPolicy,
  beforeParse: requireInstanceAdmin,
  mapInput: async ({ query }) => ({ ...(await instanceOrganizationInput()), days: query.days }),
  useCase: readNexoraConsumption,
})
