import { LRUCache } from 'lru-cache'
import type { GatewayKey } from '@/lib/nexora/developer-api/policy'
import { getInstanceOrganizationId } from '@/lib/organizations/instance-org'
import type { ModelGateConfig } from '@/lib/permission-groups/model-access'
import {
  getUserPermissionConfig,
  getUserPermissionConfigForOrganization,
} from '@/lib/permission-groups/resolve.server'
import { getWorkspaceWithOwner } from '@/lib/workspaces/permissions/utils'

type KeyGovernance = Pick<GatewayKey, 'scope' | 'workspaceId' | 'createdBy'>

/**
 * The access-group config that governs a key's models, read fresh: a workspace key answers to its
 * creator's group in its workspace (a key never outranks its creator); an instance key, or a key
 * whose creator's account is gone, to the organization's default group.
 */
export async function readKeyModelConfig(key: KeyGovernance): Promise<ModelGateConfig | null> {
  if (key.scope === 'workspace' && key.workspaceId && key.createdBy) {
    return getUserPermissionConfig(key.createdBy, key.workspaceId)
  }
  const organizationId =
    key.scope === 'workspace' && key.workspaceId
      ? ((await getWorkspaceWithOwner(key.workspaceId, { includeArchived: true }))
          ?.organizationId ?? null)
      : await getInstanceOrganizationId()
  return organizationId ? getUserPermissionConfigForOrganization(organizationId) : null
}

/** A group change reaches running keys within this delay. */
const KEY_MODEL_CONFIG_TTL_MS = 30_000

const keyModelConfigs = new LRUCache<string, { config: ModelGateConfig | null }, KeyGovernance>({
  max: 10_000,
  ttl: KEY_MODEL_CONFIG_TTL_MS,
  fetchMethod: async (_keyId, _stale, { context }) => ({
    config: await readKeyModelConfig(context),
  }),
})

/** {@link readKeyModelConfig} for the gateway's calls, cached briefly per key (the gate, never the key). */
export async function keyModelConfig(key: GatewayKey): Promise<ModelGateConfig | null> {
  const cached = await keyModelConfigs.fetch(key.id, { context: key })
  return cached?.config ?? null
}
