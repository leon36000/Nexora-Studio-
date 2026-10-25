import { AuditAction, AuditResourceType, recordAudit } from '@sim/audit'
import { db } from '@sim/db'
import { organization } from '@sim/db/schema'
import { isRecordLike, toRecord } from '@sim/utils/object'
import { eq } from 'drizzle-orm'
import { LRUCache } from 'lru-cache'
import { isCodeSandboxConfigured } from '@/lib/execution/remote-sandbox/nexora'
import { getInstanceOrganizationId } from '@/lib/organizations/instance-org'

/**
 * Nexora edition: the « Exécution de code » switch of Réglages. AI-written Python only runs when
 * the sandbox service is installed (profile « code ») **and** an instance administrator turned
 * this on; both default to off. The switch lives in the instance organization's metadata, like
 * the model cards, and is read at execution through a short cache, so turning it off takes
 * effect within seconds without a restart.
 */

const METADATA_KEY = 'nexoraCodeExecution'
const GATE_TTL_MS = 15_000

export interface StoredCodeExecution {
  enabled: boolean
  updatedAt?: string
}

/** The switch kept in `organization.metadata`, tolerating anything stored there. */
export function parseCodeExecution(metadata: unknown): StoredCodeExecution {
  const stored = isRecordLike(metadata) ? metadata[METADATA_KEY] : undefined
  if (!isRecordLike(stored) || stored.enabled !== true) return { enabled: false }
  return {
    enabled: true,
    ...(typeof stored.updatedAt === 'string' ? { updatedAt: stored.updatedAt } : {}),
  }
}

export function mergeCodeExecution(
  metadata: unknown,
  enabled: boolean,
  updatedAt: string
): Record<string, unknown> {
  return { ...toRecord(metadata), [METADATA_KEY]: { enabled, updatedAt } }
}

interface CodeExecutionGateOptions {
  isConfigured: () => boolean
  readEnabled: () => Promise<boolean>
  ttlMs: number
  now?: () => number
}

/** Fails closed: no sandbox service, or a setting that cannot be read, means code does not run. */
export function createCodeExecutionGate(options: CodeExecutionGateOptions) {
  const cache = new LRUCache<string, boolean>({
    max: 1,
    ttl: options.ttlMs,
    ttlResolution: 0,
    ...(options.now ? { perf: { now: options.now } } : {}),
  })
  return {
    async isEnabled(): Promise<boolean> {
      if (!options.isConfigured()) return false
      const cached = cache.get('enabled')
      if (cached !== undefined) return cached
      try {
        const enabled = await options.readEnabled()
        cache.set('enabled', enabled)
        return enabled
      } catch {
        return false
      }
    },
    invalidate(): void {
      cache.clear()
    },
  }
}

async function readStored(organizationId: string): Promise<StoredCodeExecution> {
  const [row] = await db
    .select({ metadata: organization.metadata })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1)
  return parseCodeExecution(row?.metadata)
}

const gate = createCodeExecutionGate({
  isConfigured: isCodeSandboxConfigured,
  readEnabled: async () => {
    const organizationId = await getInstanceOrganizationId()
    return organizationId ? (await readStored(organizationId)).enabled : false
  },
  ttlMs: GATE_TTL_MS,
})

/** Whether AI-written code may run now: the service is installed and an administrator allowed it. */
export const isCodeExecutionEnabled = gate.isEnabled

/** The stored switch, read fresh for the settings screen. */
export async function readCodeExecutionSetting(
  organizationId: string
): Promise<StoredCodeExecution> {
  return readStored(organizationId)
}

interface CodeExecutionActor {
  userId: string
  organizationId: string
  request?: { headers: { get(name: string): string | null } }
}

/** Turns code execution on or off under a row lock and records it in the audit log. */
export async function updateCodeExecutionSetting(
  enabled: boolean,
  actor: CodeExecutionActor
): Promise<StoredCodeExecution> {
  const updatedAt = new Date().toISOString()
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ metadata: organization.metadata })
      .from(organization)
      .where(eq(organization.id, actor.organizationId))
      .for('update')
      .limit(1)
    await tx
      .update(organization)
      .set({ metadata: mergeCodeExecution(row?.metadata, enabled, updatedAt) })
      .where(eq(organization.id, actor.organizationId))
  })
  gate.invalidate()
  recordAudit({
    actorId: actor.userId,
    action: AuditAction.INSTANCE_SETTINGS_UPDATED,
    resourceType: AuditResourceType.ORGANIZATION,
    resourceId: actor.organizationId,
    description: `Turned code execution ${enabled ? 'on' : 'off'}`,
    metadata: { sections: [enabled ? 'codeExecution:on' : 'codeExecution:off'] },
    request: actor.request,
  })
  return { enabled, updatedAt }
}
