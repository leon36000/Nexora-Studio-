import type { NexoraApiKey } from '@/lib/api/contracts/nexora-api-keys'
import type {
  ListedNexoraApiKey,
  NexoraApiKeySettings,
} from '@/lib/nexora/developer-api/repository'

/** A key on the wire: dates as ISO strings, never the value or its hash. */
export function presentNexoraApiKey(key: ListedNexoraApiKey): NexoraApiKey {
  return {
    id: key.id,
    name: key.name,
    scope: key.scope,
    workspaceId: key.workspaceId,
    keySuffix: key.keySuffix,
    allowedModels: key.allowedModels,
    allowAgents: key.allowAgents,
    monthlyTokenCap: key.monthlyTokenCap,
    requestsPerMinute: key.requestsPerMinute,
    expiresAt: key.expiresAt?.toISOString() ?? null,
    revokedAt: key.revokedAt?.toISOString() ?? null,
    lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
    createdAt: key.createdAt.toISOString(),
    createdByName: key.createdByName,
    status: key.status,
    usage: key.usage,
  }
}

/** The settings of a new key, from a parsed creation body. */
export function keySettings(body: {
  name: string
  expiresAt: string | null
  allowedModels: string[] | null
  monthlyTokenCap: number | null
  requestsPerMinute: number
  allowAgents?: boolean
}): NexoraApiKeySettings {
  return {
    name: body.name,
    expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    allowedModels: body.allowedModels ? [...new Set(body.allowedModels)] : null,
    allowAgents: body.allowAgents ?? false,
    monthlyTokenCap: body.monthlyTokenCap,
    requestsPerMinute: body.requestsPerMinute,
  }
}
