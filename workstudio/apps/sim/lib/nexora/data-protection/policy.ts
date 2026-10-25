import { db } from '@sim/db'
import { organization } from '@sim/db/schema'
import { isRecordLike, toRecord } from '@sim/utils/object'
import { eq } from 'drizzle-orm'
import { LRUCache } from 'lru-cache'
import { getInstanceOrganizationId } from '@/lib/organizations/instance-org'

/**
 * Nexora edition: what happens to personal data on its way to a model that is not on this server
 * (« Hors instance »). `allow` sends it as it is, `mask` replaces it with `[IBAN]`, `<PERSON>`…,
 * `refuse` stops the request. The instance has a default and each workspace may have its own mode,
 * kept in the instance organization's `metadata.nexoraDataProtection` (server-only state, like the
 * budgets). Nothing is protected until an administrator chooses: the default is `allow`.
 */
export const PERSONAL_DATA_MODES = ['allow', 'mask', 'refuse'] as const
export type PersonalDataMode = (typeof PERSONAL_DATA_MODES)[number]

export interface DataProtectionPolicy {
  /** The mode of every workspace without a mode of its own, and of calls that name no workspace. */
  defaultMode: PersonalDataMode
  /** The mode of a workspace, by id; may be looser or stricter than the default. */
  workspaceModes: Record<string, PersonalDataMode>
}

export interface DataProtectionChange {
  defaultMode?: PersonalDataMode
  /** A `null` mode removes that workspace's own mode. */
  workspaceModes?: Record<string, PersonalDataMode | null>
}

const METADATA_KEY = 'nexoraDataProtection'

/** A change reaches the other processes within this delay (see `sim-caching`: the gate is cached). */
const POLICY_TTL_MS = 30_000

function isMode(value: unknown): value is PersonalDataMode {
  return typeof value === 'string' && (PERSONAL_DATA_MODES as readonly string[]).includes(value)
}

/** Reads the policy kept in `organization.metadata`, tolerating anything stored there. */
export function parseDataProtection(metadata: unknown): DataProtectionPolicy {
  const stored = isRecordLike(metadata) ? metadata[METADATA_KEY] : undefined
  const record = toRecord(stored)
  const workspaceModes: Record<string, PersonalDataMode> = {}
  for (const [workspaceId, mode] of Object.entries(toRecord(record.workspaceModes))) {
    if (isMode(mode)) workspaceModes[workspaceId] = mode
  }
  return { defaultMode: isMode(record.defaultMode) ? record.defaultMode : 'allow', workspaceModes }
}

export function applyDataProtectionChange(
  policy: DataProtectionPolicy,
  change: DataProtectionChange
): DataProtectionPolicy {
  const workspaceModes = { ...policy.workspaceModes }
  for (const [workspaceId, mode] of Object.entries(change.workspaceModes ?? {})) {
    if (mode === null) delete workspaceModes[workspaceId]
    else if (isMode(mode)) workspaceModes[workspaceId] = mode
  }
  return {
    defaultMode: isMode(change.defaultMode) ? change.defaultMode : policy.defaultMode,
    workspaceModes,
  }
}

/** The mode that applies to a call made for `workspaceId` (`null`: no workspace, as an instance key). */
export function resolveMode(
  policy: DataProtectionPolicy,
  workspaceId: string | null
): PersonalDataMode {
  if (workspaceId !== null && Object.hasOwn(policy.workspaceModes, workspaceId)) {
    return policy.workspaceModes[workspaceId]
  }
  return policy.defaultMode
}

/** The policy of the instance, read fresh, or `null` without an instance organization. */
export async function readDataProtection(): Promise<
  (DataProtectionPolicy & { organizationId: string }) | null
> {
  const organizationId = await getInstanceOrganizationId()
  if (!organizationId) return null
  const [row] = await db
    .select({ metadata: organization.metadata })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1)
  return { ...parseDataProtection(row?.metadata), organizationId }
}

const policyCache = new LRUCache<'policy', DataProtectionPolicy>({
  max: 1,
  ttl: POLICY_TTL_MS,
  allowStaleOnFetchRejection: true,
  fetchMethod: async () => {
    const stored = await readDataProtection()
    return stored
      ? { defaultMode: stored.defaultMode, workspaceModes: stored.workspaceModes }
      : { defaultMode: 'allow', workspaceModes: {} }
  },
})

/**
 * The policy as the guard of a model call reads it: cached for {@link POLICY_TTL_MS}, dropped at
 * once in the process that saves a change. A read that fails with nothing cached throws, so a
 * call is refused rather than sent unprotected.
 */
export async function loadDataProtection(): Promise<DataProtectionPolicy> {
  const policy = await policyCache.fetch('policy')
  if (!policy) throw new Error('The personal-data policy could not be read')
  return policy
}

/** Drops the cached policy. Test seam; production clears it through {@link updateDataProtection}. */
export function resetDataProtectionCache(): void {
  policyCache.clear()
}

/** Applies a change under a row lock, keeping every other metadata key. */
export async function updateDataProtection(
  organizationId: string,
  change: DataProtectionChange
): Promise<DataProtectionPolicy> {
  const policy = await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ metadata: organization.metadata })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .for('update')
      .limit(1)
    const next = applyDataProtectionChange(parseDataProtection(row?.metadata), change)
    await tx
      .update(organization)
      .set({ metadata: { ...toRecord(row?.metadata), [METADATA_KEY]: next } })
      .where(eq(organization.id, organizationId))
    return next
  })
  policyCache.clear()
  return policy
}
