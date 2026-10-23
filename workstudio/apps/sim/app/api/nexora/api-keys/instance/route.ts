import {
  createInstanceNexoraApiKeyContract,
  listInstanceNexoraApiKeysContract,
} from '@/lib/api/contracts/nexora-api-keys'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import {
  createInstanceNexoraApiKey,
  listInstanceNexoraApiKeys,
} from '@/lib/nexora/developer-api/application/use-cases'
import { keySettings, presentNexoraApiKey } from '@/app/api/nexora/api-keys/surface'
import {
  instanceOrganizationInput,
  requireInstanceAdmin,
} from '@/app/api/nexora/consumption/surface'

export const dynamic = 'force-dynamic'

/** Instance-wide developer API keys (models only). Instance owners and admins. */
export const GET = defineInternalJsonRoute({
  contract: listInstanceNexoraApiKeysContract,
  operation: listInstanceNexoraApiKeys.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.none({ reason: 'Instance-admin settings read' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  beforeParse: requireInstanceAdmin,
  mapInput: () => instanceOrganizationInput(),
  useCase: listInstanceNexoraApiKeys,
  present: ({ keys }) => ({ keys: keys.map(presentNexoraApiKey) }),
})

export const POST = defineInternalJsonRoute({
  contract: createInstanceNexoraApiKeyContract,
  operation: createInstanceNexoraApiKey.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.api-keys.write' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  beforeParse: requireInstanceAdmin,
  mapInput: async ({ body }) => ({
    ...(await instanceOrganizationInput()),
    settings: keySettings(body),
  }),
  useCase: createInstanceNexoraApiKey,
  present: ({ key, value }) => ({ key: presentNexoraApiKey(key), value }),
})
