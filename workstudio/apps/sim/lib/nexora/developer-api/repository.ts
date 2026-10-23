import { db } from '@sim/db'
import { nexoraApiKey, nexoraApiKeyUsage, user, workspace } from '@sim/db/schema'
import { createLogger } from '@sim/logger'
import { sha256Hex } from '@sim/security/hash'
import { generateSecureToken } from '@sim/security/tokens'
import { generateId } from '@sim/utils/id'
import { and, desc, eq, gte, inArray, isNull, lt, lte, not, or, type SQL, sql } from 'drizzle-orm'
import { getWallClockParts } from '@/lib/core/utils/timezone'
import { instanceTimeZone, monthWindow } from '@/lib/nexora/consumption/period'
import {
  AGENT_MODEL_PREFIX,
  type GatewayKey,
  keyStatus,
  NEXORA_API_KEY_PREFIX,
} from '@/lib/nexora/developer-api/policy'

const logger = createLogger('NexoraApiKeys')

/** Characters of the value kept to tell keys apart in the list. */
const SUFFIX_LENGTH = 4
/** `last_used_at` is display-only: rewritten at most once a minute per key. */
const LAST_USED_STALENESS_MS = 60_000

export type NexoraApiKeyScope = 'workspace' | 'instance'

export interface NexoraApiKeySettings {
  name: string
  expiresAt: Date | null
  allowedModels: string[] | null
  allowAgents: boolean
  monthlyTokenCap: number | null
  requestsPerMinute: number
}

/** A key as the settings screen lists it, with this month's use. */
export interface ListedNexoraApiKey extends GatewayKey {
  keySuffix: string
  lastUsedAt: Date | null
  createdAt: Date
  createdByName: string | null
  status: 'active' | 'expired' | 'revoked'
  usage: { month: string; requests: number; totalTokens: number }
}

export function hashNexoraApiKey(value: string): string {
  return sha256Hex(value)
}

/** The local calendar day of `now` in the instance time zone, `YYYY-MM-DD`. */
function localDay(now: Date, timeZone: string = instanceTimeZone()): string {
  const { year, month, day } = getWallClockParts(now, timeZone)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** The first local day of a `YYYY-MM` month and the first of the next one. */
export function monthDayRange(month: string): { first: string; next: string } {
  const [year, monthNumber] = month.split('-').map(Number)
  const nextYear = monthNumber === 12 ? year + 1 : year
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1
  return {
    first: `${month}-01`,
    next: `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`,
  }
}

/** The month containing `now` in the instance time zone, with its day range. */
function monthDays(now: Date, timeZone: string = instanceTimeZone()) {
  const { month } = monthWindow(now, timeZone)
  return { month, ...monthDayRange(month) }
}

const keyColumns = {
  id: nexoraApiKey.id,
  name: nexoraApiKey.name,
  scope: nexoraApiKey.scope,
  workspaceId: nexoraApiKey.workspaceId,
  allowedModels: nexoraApiKey.allowedModels,
  allowAgents: nexoraApiKey.allowAgents,
  monthlyTokenCap: nexoraApiKey.monthlyTokenCap,
  requestsPerMinute: nexoraApiKey.requestsPerMinute,
  expiresAt: nexoraApiKey.expiresAt,
  revokedAt: nexoraApiKey.revokedAt,
}

type KeyRow = {
  [K in keyof typeof keyColumns]: (typeof keyColumns)[K]['_']['data'] | null
}

function toGatewayKey(row: KeyRow): GatewayKey {
  return {
    id: row.id ?? '',
    name: row.name ?? '',
    scope: row.scope === 'instance' ? 'instance' : 'workspace',
    workspaceId: row.workspaceId ?? null,
    allowedModels: Array.isArray(row.allowedModels) ? row.allowedModels : null,
    allowAgents: row.allowAgents ?? true,
    monthlyTokenCap: row.monthlyTokenCap ?? null,
    requestsPerMinute: row.requestsPerMinute ?? 60,
    expiresAt: row.expiresAt ?? null,
    revokedAt: row.revokedAt ?? null,
  }
}

/** The key whose value hashes to `hash`, revoked and expired ones included (they answer 401). */
export async function findNexoraApiKeyByHash(hash: string): Promise<GatewayKey | null> {
  const [row] = await db
    .select(keyColumns)
    .from(nexoraApiKey)
    .where(eq(nexoraApiKey.keyHash, hash))
    .limit(1)
  return row ? toGatewayKey(row) : null
}

/** Tokens (prompt + completion) the key used since the 1st of the month containing `now`. */
export async function monthTokensOfKey(keyId: string, now = new Date()): Promise<number> {
  const { first, next } = monthDays(now)
  const [row] = await db
    .select({
      tokens: sql<string>`COALESCE(SUM(${nexoraApiKeyUsage.promptTokens} + ${nexoraApiKeyUsage.completionTokens}), 0)`,
    })
    .from(nexoraApiKeyUsage)
    .where(
      and(
        eq(nexoraApiKeyUsage.keyId, keyId),
        gte(nexoraApiKeyUsage.day, first),
        lt(nexoraApiKeyUsage.day, next)
      )
    )
  return Number(row?.tokens ?? 0) || 0
}

/** Adds one call to the key's usage of the day (local to the instance) for `model`. */
export async function recordNexoraApiKeyUsage(entry: {
  keyId: string
  model: string
  promptTokens: number
  completionTokens: number
  now?: Date
}): Promise<void> {
  const day = localDay(entry.now ?? new Date())
  const prompt = Math.max(0, Math.round(entry.promptTokens))
  const completion = Math.max(0, Math.round(entry.completionTokens))
  await db
    .insert(nexoraApiKeyUsage)
    .values({
      keyId: entry.keyId,
      day,
      model: entry.model,
      requests: 1,
      promptTokens: prompt,
      completionTokens: completion,
    })
    .onConflictDoUpdate({
      target: [nexoraApiKeyUsage.keyId, nexoraApiKeyUsage.day, nexoraApiKeyUsage.model],
      set: {
        requests: sql`${nexoraApiKeyUsage.requests} + 1`,
        promptTokens: sql`${nexoraApiKeyUsage.promptTokens} + ${prompt}`,
        completionTokens: sql`${nexoraApiKeyUsage.completionTokens} + ${completion}`,
      },
    })
}

/** Marks the key used, at most once a minute (display only, never awaited by a request). */
export async function touchNexoraApiKey(keyId: string, now = new Date()): Promise<void> {
  try {
    await db
      .update(nexoraApiKey)
      .set({ lastUsedAt: now })
      .where(
        and(
          eq(nexoraApiKey.id, keyId),
          or(
            isNull(nexoraApiKey.lastUsedAt),
            lt(nexoraApiKey.lastUsedAt, new Date(now.getTime() - LAST_USED_STALENESS_MS))
          )
        )
      )
  } catch (error) {
    logger.warn('Could not record when a developer API key was last used', { keyId, error })
  }
}

function scopeCondition(scope: NexoraApiKeyScope, workspaceId: string | null): SQL | undefined {
  return scope === 'workspace' && workspaceId
    ? and(eq(nexoraApiKey.scope, 'workspace'), eq(nexoraApiKey.workspaceId, workspaceId))
    : and(eq(nexoraApiKey.scope, 'instance'), isNull(nexoraApiKey.workspaceId))
}

/** The keys of one scope, newest first, with this month's use. */
export async function listNexoraApiKeys(
  scope: NexoraApiKeyScope,
  workspaceId: string | null,
  now = new Date()
): Promise<ListedNexoraApiKey[]> {
  const rows = await db
    .select({
      ...keyColumns,
      keySuffix: nexoraApiKey.keySuffix,
      lastUsedAt: nexoraApiKey.lastUsedAt,
      createdAt: nexoraApiKey.createdAt,
      createdByName: user.name,
    })
    .from(nexoraApiKey)
    .leftJoin(user, eq(user.id, nexoraApiKey.createdBy))
    .where(scopeCondition(scope, workspaceId))
    .orderBy(desc(nexoraApiKey.createdAt))
  const usage = await monthUsageOfKeys(
    rows.map((row) => row.id),
    now
  )
  const { month } = monthDays(now)
  return rows.map((row) => {
    const key = toGatewayKey(row)
    return {
      ...key,
      keySuffix: row.keySuffix,
      lastUsedAt: row.lastUsedAt,
      createdAt: row.createdAt,
      createdByName: row.createdByName ?? null,
      status: keyStatus(key, now),
      usage: { month, ...(usage.get(row.id) ?? { requests: 0, totalTokens: 0 }) },
    }
  })
}

async function monthUsageOfKeys(keyIds: string[], now: Date) {
  const usage = new Map<string, { requests: number; totalTokens: number }>()
  if (keyIds.length === 0) return usage
  const { first, next } = monthDays(now)
  const rows = await db
    .select({
      keyId: nexoraApiKeyUsage.keyId,
      requests: sql<string>`SUM(${nexoraApiKeyUsage.requests})`,
      tokens: sql<string>`SUM(${nexoraApiKeyUsage.promptTokens} + ${nexoraApiKeyUsage.completionTokens})`,
    })
    .from(nexoraApiKeyUsage)
    .where(
      and(
        inArray(nexoraApiKeyUsage.keyId, keyIds),
        gte(nexoraApiKeyUsage.day, first),
        lt(nexoraApiKeyUsage.day, next)
      )
    )
    .groupBy(nexoraApiKeyUsage.keyId)
  for (const row of rows) {
    usage.set(row.keyId, {
      requests: Number(row.requests) || 0,
      totalTokens: Number(row.tokens) || 0,
    })
  }
  return usage
}

/** Creates a key and returns it with its value, the only time the value exists outside a hash. */
export async function insertNexoraApiKey(input: {
  scope: NexoraApiKeyScope
  workspaceId: string | null
  createdBy: string
  settings: NexoraApiKeySettings
}): Promise<{ id: string; value: string }> {
  const value = `${NEXORA_API_KEY_PREFIX}${generateSecureToken(30)}`
  const id = generateId()
  await db.insert(nexoraApiKey).values({
    id,
    name: input.settings.name,
    scope: input.scope,
    workspaceId: input.scope === 'workspace' ? input.workspaceId : null,
    createdBy: input.createdBy,
    keyHash: hashNexoraApiKey(value),
    keySuffix: value.slice(-SUFFIX_LENGTH),
    allowedModels: input.settings.allowedModels,
    allowAgents: input.scope === 'workspace' ? input.settings.allowAgents : false,
    monthlyTokenCap: input.settings.monthlyTokenCap,
    requestsPerMinute: input.settings.requestsPerMinute,
    expiresAt: input.settings.expiresAt,
  })
  return { id, value }
}

/** Revokes a key of the scope; `null` when no such key exists there. Revoking twice is a no-op. */
export async function revokeNexoraApiKey(input: {
  keyId: string
  scope: NexoraApiKeyScope
  workspaceId: string | null
  revokedBy: string
  now?: Date
}): Promise<{ id: string; name: string } | null> {
  const scope = scopeCondition(input.scope, input.workspaceId)
  const [revoked] = await db
    .update(nexoraApiKey)
    .set({ revokedAt: input.now ?? new Date(), revokedBy: input.revokedBy })
    .where(and(eq(nexoraApiKey.id, input.keyId), scope, isNull(nexoraApiKey.revokedAt)))
    .returning({ id: nexoraApiKey.id, name: nexoraApiKey.name })
  if (revoked) return revoked
  const [existing] = await db
    .select({ id: nexoraApiKey.id, name: nexoraApiKey.name })
    .from(nexoraApiKey)
    .where(and(eq(nexoraApiKey.id, input.keyId), scope))
    .limit(1)
  return existing ?? null
}

/** One key's use over a period of local days, for Réglages › Consommation. */
export interface KeyConsumption {
  keyId: string
  name: string
  scope: NexoraApiKeyScope
  workspaceId: string | null
  workspaceName: string | null
  revoked: boolean
  requests: number
  modelTokens: number
  agentTokens: number
}

const AGENT_ROWS = sql`${nexoraApiKeyUsage.model} LIKE ${`${AGENT_MODEL_PREFIX}%`}`

/** Use per key over `[firstDay, lastDay]` (local days, inclusive), heaviest first. */
export async function readKeyConsumption(
  firstDay: string,
  lastDay: string
): Promise<KeyConsumption[]> {
  const rows = await db
    .select({
      keyId: nexoraApiKey.id,
      name: nexoraApiKey.name,
      scope: nexoraApiKey.scope,
      workspaceId: nexoraApiKey.workspaceId,
      workspaceName: workspace.name,
      revokedAt: nexoraApiKey.revokedAt,
      requests: sql<string>`SUM(${nexoraApiKeyUsage.requests})`,
      modelTokens: sql<string>`COALESCE(SUM(${nexoraApiKeyUsage.promptTokens} + ${nexoraApiKeyUsage.completionTokens}) FILTER (WHERE NOT (${AGENT_ROWS})), 0)`,
      agentTokens: sql<string>`COALESCE(SUM(${nexoraApiKeyUsage.promptTokens} + ${nexoraApiKeyUsage.completionTokens}) FILTER (WHERE ${AGENT_ROWS}), 0)`,
    })
    .from(nexoraApiKeyUsage)
    .innerJoin(nexoraApiKey, eq(nexoraApiKey.id, nexoraApiKeyUsage.keyId))
    .leftJoin(workspace, eq(workspace.id, nexoraApiKey.workspaceId))
    .where(and(gte(nexoraApiKeyUsage.day, firstDay), lte(nexoraApiKeyUsage.day, lastDay)))
    .groupBy(
      nexoraApiKey.id,
      nexoraApiKey.name,
      nexoraApiKey.scope,
      nexoraApiKey.workspaceId,
      workspace.name,
      nexoraApiKey.revokedAt
    )
  return rows
    .map((row) => ({
      keyId: row.keyId,
      name: row.name,
      scope: (row.scope === 'instance' ? 'instance' : 'workspace') as NexoraApiKeyScope,
      workspaceId: row.workspaceId,
      workspaceName: row.workspaceName ?? null,
      revoked: row.revokedAt !== null,
      requests: Number(row.requests) || 0,
      modelTokens: Number(row.modelTokens) || 0,
      agentTokens: Number(row.agentTokens) || 0,
    }))
    .sort((a, b) => b.modelTokens + b.agentTokens - (a.modelTokens + a.agentTokens))
}

/**
 * Tokens of direct model calls (agents excluded: their runs already land in the usage ledger)
 * over `[firstDay, nextDay)`, for the whole instance and for `workspaceId`'s keys.
 */
export async function directModelTokens(
  workspaceId: string,
  firstDay: string,
  nextDay: string
): Promise<{ instance: number; workspace: number }> {
  const [row] = await db
    .select({
      instance: sql<string>`COALESCE(SUM(${nexoraApiKeyUsage.promptTokens} + ${nexoraApiKeyUsage.completionTokens}), 0)`,
      workspace: sql<string>`COALESCE(SUM(${nexoraApiKeyUsage.promptTokens} + ${nexoraApiKeyUsage.completionTokens}) FILTER (WHERE ${nexoraApiKey.workspaceId} = ${workspaceId}), 0)`,
    })
    .from(nexoraApiKeyUsage)
    .innerJoin(nexoraApiKey, eq(nexoraApiKey.id, nexoraApiKeyUsage.keyId))
    .where(
      and(gte(nexoraApiKeyUsage.day, firstDay), lt(nexoraApiKeyUsage.day, nextDay), not(AGENT_ROWS))
    )
  return {
    instance: Number(row?.instance ?? 0) || 0,
    workspace: Number(row?.workspace ?? 0) || 0,
  }
}

/** Direct model-call tokens of the month per workspace (instance keys under `null`). */
export async function directModelTokensByWorkspace(
  firstDay: string,
  nextDay: string
): Promise<{ instance: number; workspaces: Record<string, number> }> {
  const rows = await db
    .select({
      workspaceId: nexoraApiKey.workspaceId,
      tokens: sql<string>`COALESCE(SUM(${nexoraApiKeyUsage.promptTokens} + ${nexoraApiKeyUsage.completionTokens}), 0)`,
    })
    .from(nexoraApiKeyUsage)
    .innerJoin(nexoraApiKey, eq(nexoraApiKey.id, nexoraApiKeyUsage.keyId))
    .where(
      and(gte(nexoraApiKeyUsage.day, firstDay), lt(nexoraApiKeyUsage.day, nextDay), not(AGENT_ROWS))
    )
    .groupBy(nexoraApiKey.workspaceId)
  const workspaces: Record<string, number> = {}
  let instance = 0
  for (const row of rows) {
    const tokens = Number(row.tokens) || 0
    instance += tokens
    if (row.workspaceId) workspaces[row.workspaceId] = tokens
  }
  return { instance, workspaces }
}
