import { revokeWorkspaceNexoraApiKeyContract } from '@/lib/api/contracts/nexora-api-keys'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import { revokeWorkspaceNexoraApiKey } from '@/lib/nexora/developer-api/application/use-cases'
import { presentNexoraApiKey } from '@/app/api/nexora/api-keys/surface'

/** Revokes a workspace key: every call with it answers 401 from now on. */
export const DELETE = defineInternalJsonRoute({
  contract: revokeWorkspaceNexoraApiKeyContract,
  operation: revokeWorkspaceNexoraApiKey.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.api-keys.write' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ params, query }) => ({ workspaceId: query.workspaceId, keyId: params.keyId }),
  useCase: revokeWorkspaceNexoraApiKey,
  present: ({ key }) => ({ key: presentNexoraApiKey(key) }),
})
