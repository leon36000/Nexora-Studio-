import { revokeInstanceNexoraApiKeyContract } from '@/lib/api/contracts/nexora-api-keys'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { revokeInstanceNexoraApiKey } from '@/lib/nexora/developer-api/application/use-cases'
import { presentNexoraApiKey } from '@/app/api/nexora/api-keys/surface'
import {
  instanceOrganizationInput,
  requireInstanceAdmin,
} from '@/app/api/nexora/consumption/surface'

export const DELETE = defineInternalJsonRoute({
  contract: revokeInstanceNexoraApiKeyContract,
  operation: revokeInstanceNexoraApiKey.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.api-keys.write' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  beforeParse: requireInstanceAdmin,
  mapInput: async ({ params }) => ({
    ...(await instanceOrganizationInput()),
    keyId: params.keyId,
  }),
  useCase: revokeInstanceNexoraApiKey,
  present: ({ key }) => ({ key: presentNexoraApiKey(key) }),
})
