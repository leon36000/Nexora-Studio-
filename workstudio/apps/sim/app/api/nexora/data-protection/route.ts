import {
  getNexoraDataProtectionContract,
  updateNexoraDataProtectionContract,
} from '@/lib/api/contracts/nexora-data-protection'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import {
  readNexoraDataProtection,
  updateNexoraDataProtection,
} from '@/lib/nexora/data-protection/application/use-cases'
import {
  instanceOrganizationInput,
  requireInstanceAdmin,
} from '@/app/api/nexora/consumption/surface'

export const dynamic = 'force-dynamic'

const rateLimit = internalRateLimits.none({
  reason: 'Instance-admin settings, read and saved by hand from the settings page',
})

/** Réglages › Données personnelles: what happens to personal data sent to a model outside this server. */
export const GET = defineInternalJsonRoute({
  contract: getNexoraDataProtectionContract,
  operation: readNexoraDataProtection.operation,
  auth: internalSessionAuth,
  rateLimit,
  errorPolicy: internalOrchestrationErrorPolicy,
  beforeParse: requireInstanceAdmin,
  mapInput: () => instanceOrganizationInput(),
  useCase: readNexoraDataProtection,
})

export const PUT = defineInternalJsonRoute({
  contract: updateNexoraDataProtectionContract,
  operation: updateNexoraDataProtection.operation,
  auth: internalSessionAuth,
  rateLimit,
  errorPolicy: internalOrchestrationErrorPolicy,
  beforeParse: requireInstanceAdmin,
  mapInput: async ({ body }) => ({ ...(await instanceOrganizationInput()), change: body }),
  useCase: updateNexoraDataProtection,
  present: ({ previous: _previous, ...overview }) => overview,
})
