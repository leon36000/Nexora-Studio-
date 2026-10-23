import {
  createWorkspaceNexoraApiKeyContract,
  listWorkspaceNexoraApiKeysContract,
} from '@/lib/api/contracts/nexora-api-keys'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import {
  createWorkspaceNexoraApiKey,
  listWorkspaceNexoraApiKeys,
} from '@/lib/nexora/developer-api/application/use-cases'
import { keySettings, presentNexoraApiKey } from '@/app/api/nexora/api-keys/surface'

export const dynamic = 'force-dynamic'

/** Réglages › Clés API: the workspace's developer API keys, with this month's use. */
export const GET = defineInternalJsonRoute({
  contract: listWorkspaceNexoraApiKeysContract,
  operation: listWorkspaceNexoraApiKeys.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.none({ reason: 'Settings read, issued when the keys page opens' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ query }) => ({ workspaceId: query.workspaceId }),
  useCase: listWorkspaceNexoraApiKeys,
  present: ({ keys }) => ({ keys: keys.map(presentNexoraApiKey) }),
})

/** Creates a workspace key; its value is in this response only. */
export const POST = defineInternalJsonRoute({
  contract: createWorkspaceNexoraApiKeyContract,
  operation: createWorkspaceNexoraApiKey.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.api-keys.write' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  mapInput: ({ body }) => ({ workspaceId: body.workspaceId, settings: keySettings(body) }),
  useCase: createWorkspaceNexoraApiKey,
  present: ({ key, value }) => ({ key: presentNexoraApiKey(key), value }),
})
