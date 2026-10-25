import { db } from '@sim/db'
import { nexoraApiKey, nexoraTrace, nexoraTraceSpan, user } from '@sim/db/schema'
import { and, eq, gte, ilike, isNull, lt, lte, or, type SQL, sql } from 'drizzle-orm'
import type { StoredTrace } from '@/lib/nexora/traces/stored'
import type { TraceSource } from '@/lib/nexora/traces/types'

const SPAN_INSERT_CHUNK = 200
const FACET_LIMIT = 100
const FACET_WINDOW_MS = 31 * 86_400_000

/**
 * Writes one trace and its spans in one transaction. A trace already written for the same
 * execution (a completion replayed after a pause) is left as it is: returns `false` then.
 */
export async function insertTrace({ trace, spans }: StoredTrace): Promise<boolean> {
  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(nexoraTrace)
      .values(trace)
      .onConflictDoNothing()
      .returning({ id: nexoraTrace.id })
    if (inserted.length === 0) return false
    for (let index = 0; index < spans.length; index += SPAN_INSERT_CHUNK) {
      await tx.insert(nexoraTraceSpan).values(spans.slice(index, index + SPAN_INSERT_CHUNK))
    }
    return true
  })
}

/** Which traces a reader may see inside a workspace: the shared ones, their own, and all if admin. */
export interface TraceScope {
  userId: string
  seesPrivate: boolean
}

export interface TraceFilters {
  /** `null` reads the traces of no workspace (instance keys): instance administrators only. */
  workspaceId: string | null
  status?: 'ok' | 'error'
  model?: string
  agentId?: string
  apiKeyId?: string
  source?: TraceSource
  minDurationMs?: number
  maxDurationMs?: number
  q?: string
  from?: Date
  to?: Date
  cursor?: string | null
  limit: number
}

export interface TraceSummaryRow {
  id: string
  workspaceId: string | null
  userId: string | null
  userName: string | null
  apiKeyId: string | null
  source: string
  visibility: string
  name: string
  agentId: string | null
  agentName: string | null
  model: string | null
  models: string[]
  status: string
  error: string | null
  startedAt: Date
  durationMs: number
  inputTokens: number
  outputTokens: number
  kgCo2eq: number | null
  spanCount: number
  toolCount: number
  truncated: boolean
  maskedCount: number
  executionId: string | null
  inputPreview: string | null
  outputPreview: string | null
}

const summaryColumns = {
  id: nexoraTrace.id,
  workspaceId: nexoraTrace.workspaceId,
  userId: nexoraTrace.userId,
  userName: user.name,
  apiKeyId: nexoraTrace.apiKeyId,
  source: nexoraTrace.source,
  visibility: nexoraTrace.visibility,
  name: nexoraTrace.name,
  agentId: nexoraTrace.agentId,
  agentName: nexoraTrace.agentName,
  model: nexoraTrace.model,
  models: nexoraTrace.models,
  status: nexoraTrace.status,
  error: nexoraTrace.error,
  startedAt: nexoraTrace.startedAt,
  durationMs: nexoraTrace.durationMs,
  inputTokens: nexoraTrace.inputTokens,
  outputTokens: nexoraTrace.outputTokens,
  kgCo2eq: nexoraTrace.kgCo2eq,
  spanCount: nexoraTrace.spanCount,
  toolCount: nexoraTrace.toolCount,
  truncated: nexoraTrace.truncated,
  maskedCount: nexoraTrace.maskedCount,
  executionId: nexoraTrace.executionId,
  inputPreview: nexoraTrace.inputPreview,
  outputPreview: nexoraTrace.outputPreview,
}

function encodeCursor(row: { startedAt: Date; id: string }): string {
  return Buffer.from(JSON.stringify([row.startedAt.toISOString(), row.id])).toString('base64url')
}

function decodeCursor(cursor: string): { startedAt: Date; id: string } | null {
  try {
    const [startedAt, id] = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as unknown[]
    const date = typeof startedAt === 'string' ? new Date(startedAt) : null
    return date && !Number.isNaN(date.getTime()) && typeof id === 'string'
      ? { startedAt: date, id }
      : null
  } catch {
    return null
  }
}

function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`)
}

/** The rows a reader may see: the workspace's, minus other members' private ones. */
function visibleTo(workspaceId: string | null, scope: TraceScope): SQL {
  if (workspaceId === null) return isNull(nexoraTrace.workspaceId)
  const inWorkspace = eq(nexoraTrace.workspaceId, workspaceId)
  if (scope.seesPrivate) return inWorkspace
  return and(
    inWorkspace,
    or(eq(nexoraTrace.visibility, 'workspace'), eq(nexoraTrace.userId, scope.userId))
  ) as SQL
}

function filterConditions(filters: TraceFilters, scope: TraceScope): SQL[] {
  const conditions: SQL[] = [visibleTo(filters.workspaceId, scope)]
  if (filters.status) conditions.push(eq(nexoraTrace.status, filters.status))
  if (filters.model) conditions.push(sql`${filters.model} = ANY(${nexoraTrace.models})`)
  if (filters.agentId) conditions.push(eq(nexoraTrace.agentId, filters.agentId))
  if (filters.apiKeyId) conditions.push(eq(nexoraTrace.apiKeyId, filters.apiKeyId))
  if (filters.source) conditions.push(eq(nexoraTrace.source, filters.source))
  if (filters.minDurationMs !== undefined) {
    conditions.push(gte(nexoraTrace.durationMs, filters.minDurationMs))
  }
  if (filters.maxDurationMs !== undefined) {
    conditions.push(lte(nexoraTrace.durationMs, filters.maxDurationMs))
  }
  if (filters.from) conditions.push(gte(nexoraTrace.startedAt, filters.from))
  if (filters.to) conditions.push(lte(nexoraTrace.startedAt, filters.to))
  if (filters.q?.trim()) {
    conditions.push(ilike(nexoraTrace.searchText, `%${escapeLike(filters.q.trim())}%`))
  }
  const cursor = filters.cursor ? decodeCursor(filters.cursor) : null
  if (cursor) {
    conditions.push(
      or(
        lt(nexoraTrace.startedAt, cursor.startedAt),
        and(eq(nexoraTrace.startedAt, cursor.startedAt), lt(nexoraTrace.id, cursor.id))
      ) as SQL
    )
  }
  return conditions
}

/** One page of traces, newest first, with the cursor of the next page. */
export async function listTraces(
  filters: TraceFilters,
  scope: TraceScope
): Promise<{ traces: TraceSummaryRow[]; nextCursor: string | null }> {
  const rows = await db
    .select(summaryColumns)
    .from(nexoraTrace)
    .leftJoin(user, eq(user.id, nexoraTrace.userId))
    .where(and(...filterConditions(filters, scope)))
    // NULLS LAST spelled out: it is how the index is declared, and PostgreSQL only walks an index
    // for an ORDER BY with the same null ordering.
    .orderBy(sql`${nexoraTrace.startedAt} DESC NULLS LAST`, sql`${nexoraTrace.id} DESC NULLS LAST`)
    .limit(filters.limit + 1)
  const page = rows.slice(0, filters.limit)
  const last = page.at(-1)
  return {
    traces: page,
    nextCursor: rows.length > filters.limit && last ? encodeCursor(last) : null,
  }
}

export interface SpanRow {
  id: string
  parentId: string | null
  position: number
  kind: string
  name: string
  model: string | null
  startedAt: Date
  durationMs: number
  status: string
  inputTokens: number
  outputTokens: number
  kgCo2eq: number | null
  input: string | null
  output: string | null
  attributes: Record<string, unknown>
}

/** A trace and its spans in tree order; `null` when it does not exist. Permission is the caller's. */
export async function getTraceWithSpans(
  traceId: string
): Promise<{ trace: TraceSummaryRow; spans: SpanRow[] } | null> {
  const [trace] = await db
    .select(summaryColumns)
    .from(nexoraTrace)
    .leftJoin(user, eq(user.id, nexoraTrace.userId))
    .where(eq(nexoraTrace.id, traceId))
    .limit(1)
  if (!trace) return null
  const spans = await db
    .select({
      id: nexoraTraceSpan.id,
      parentId: nexoraTraceSpan.parentId,
      position: nexoraTraceSpan.position,
      kind: nexoraTraceSpan.kind,
      name: nexoraTraceSpan.name,
      model: nexoraTraceSpan.model,
      startedAt: nexoraTraceSpan.startedAt,
      durationMs: nexoraTraceSpan.durationMs,
      status: nexoraTraceSpan.status,
      inputTokens: nexoraTraceSpan.inputTokens,
      outputTokens: nexoraTraceSpan.outputTokens,
      kgCo2eq: nexoraTraceSpan.kgCo2eq,
      input: nexoraTraceSpan.input,
      output: nexoraTraceSpan.output,
      attributes: nexoraTraceSpan.attributes,
    })
    .from(nexoraTraceSpan)
    .where(eq(nexoraTraceSpan.traceId, traceId))
    .orderBy(nexoraTraceSpan.position)
  return { trace, spans: spans.map((span) => ({ ...span, attributes: toAttributes(span.attributes) })) }
}

function toAttributes(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export interface TraceFacets {
  agents: { id: string; name: string }[]
  models: string[]
  apiKeys: { id: string; name: string }[]
  sources: string[]
}

/** The values the filters offer: what the reader's visible traces of the last month actually hold. */
export async function listFacets(workspaceId: string | null, scope: TraceScope): Promise<TraceFacets> {
  const visible = and(
    visibleTo(workspaceId, scope),
    gte(nexoraTrace.startedAt, new Date(Date.now() - FACET_WINDOW_MS))
  )
  const [agents, models, apiKeys, sources] = await Promise.all([
    db
      .selectDistinct({ id: nexoraTrace.agentId, name: nexoraTrace.agentName })
      .from(nexoraTrace)
      .where(and(visible, sql`${nexoraTrace.agentId} IS NOT NULL`))
      .orderBy(nexoraTrace.agentName)
      .limit(FACET_LIMIT),
    db
      .selectDistinct({ model: sql<string>`unnest(${nexoraTrace.models})` })
      .from(nexoraTrace)
      .where(visible)
      .limit(FACET_LIMIT),
    db
      .selectDistinct({ id: nexoraApiKey.id, name: nexoraApiKey.name })
      .from(nexoraTrace)
      .innerJoin(nexoraApiKey, eq(nexoraApiKey.id, nexoraTrace.apiKeyId))
      .where(visible)
      .orderBy(nexoraApiKey.name)
      .limit(FACET_LIMIT),
    db.selectDistinct({ source: nexoraTrace.source }).from(nexoraTrace).where(visible).limit(FACET_LIMIT),
  ])
  return {
    agents: agents.flatMap((row) => (row.id ? [{ id: row.id, name: row.name ?? row.id }] : [])),
    models: models.map((row) => row.model).sort(),
    apiKeys,
    sources: sources.map((row) => row.source).sort(),
  }
}
