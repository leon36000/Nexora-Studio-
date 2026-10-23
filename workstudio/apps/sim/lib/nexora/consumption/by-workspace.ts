import { dbReplica } from '@sim/db'
import { usageLog, user, workflowExecutionLogs, workspace } from '@sim/db/schema'
import { and, type Column, eq, gte, inArray, isNotNull, lt, type SQL, sql } from 'drizzle-orm'
import { assertValidTimezone } from '@/lib/core/utils/timezone'
import type { DbClient } from '@/lib/db/types'

/**
 * WorkStudio's own consumption per workspace and per person, from two tables:
 *
 * - tokens: the usage ledger (`usage_log`, written whether or not billing is on), its model rows
 *   (`category` `model` / `model_unbilled`) carrying `metadata.inputTokens` / `outputTokens`
 *   per model (`description`), workspace, actor (`user_id`) and execution. Summed the same way
 *   as the organization usage analytics (`lib/billing/core/usage-analytics-queries.ts`). A
 *   deleted workspace's ledger rows survive with `workspace_id` set to null, so its tokens stay
 *   in the instance totals.
 * - executions per workspace: `workflow_execution_logs` (one row per run, `workspace_id`,
 *   `started_at`), so a run that called no model still counts. The token and actor figures of
 *   an execution row move to object storage once its payload is externalized, which is why
 *   tokens are read from the ledger and not from there.
 *
 * A person's executions are the workflow runs they acted in that recorded model usage
 * (distinct ledger `execution_id`s): execution rows carry no actor column to count the others.
 */

interface ConsumptionTotals {
  executions: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

interface WorkspaceConsumption extends ConsumptionTotals {
  /** `null` for ledger rows whose workspace was deleted. */
  workspaceId: string | null
  name: string | null
  status: 'active' | 'archived' | 'deleted'
  /** Total tokens per model name (without the `vllm/` prefix). */
  tokensByModel: Record<string, number>
}

interface UserConsumption extends ConsumptionTotals {
  userId: string
  name: string | null
  email: string | null
  tokensByModel: Record<string, number>
}

interface ConsumptionDay {
  /** Local calendar day in the instance time zone, `YYYY-MM-DD`. */
  date: string
  executions: number
  totalTokens: number
}

export interface WorkspaceConsumptionReport {
  totals: ConsumptionTotals
  workspaces: WorkspaceConsumption[]
  /** The 20 people who used the most tokens. */
  users: UserConsumption[]
  days: ConsumptionDay[]
}

const TOP_USERS = 20
/** Ledger categories whose rows carry model tokens in `metadata`. */
export const MODEL_USAGE_CATEGORIES = ['model', 'model_unbilled'] as const
/** WorkStudio names a Nexora API model `vllm/<router>`; Nexora API knows it as `<router>`. */
const NEXORA_PROVIDER_PREFIX = 'vllm/'

const inputTokensSql = sql`COALESCE((${usageLog.metadata}->>'inputTokens')::numeric, 0)`
const outputTokensSql = sql`COALESCE((${usageLog.metadata}->>'outputTokens')::numeric, 0)`
/** One ledger row's tokens (prompt + completion), to sum over model rows. */
export const LEDGER_TOKENS_SQL = sql`(${inputTokensSql} + ${outputTokensSql})`

function localDay(column: Column, timeZone: string): SQL<string> {
  return sql<string>`to_char(date_trunc('day', (${column} AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone}), 'YYYY-MM-DD')`
}

/** Aggregates come back as numeric strings from Postgres. */
function amount(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function modelName(description: string): string {
  return description.startsWith(NEXORA_PROVIDER_PREFIX)
    ? description.slice(NEXORA_PROVIDER_PREFIX.length)
    : description
}

function emptyTotals(): ConsumptionTotals {
  return { executions: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 }
}

function addTokens(
  target: ConsumptionTotals & { tokensByModel: Record<string, number> },
  model: string,
  prompt: number,
  completion: number
): void {
  target.promptTokens += prompt
  target.completionTokens += completion
  target.totalTokens += prompt + completion
  target.tokensByModel[model] = (target.tokensByModel[model] ?? 0) + prompt + completion
}

function byConsumption(a: ConsumptionTotals, b: ConsumptionTotals): number {
  return b.totalTokens - a.totalTokens || b.executions - a.executions
}

/**
 * Executions and tokens per workspace, per person (top 20) and per local day over
 * `[start, end)`. Read-only, on the replica.
 */
export async function readWorkspaceConsumption({
  start,
  end,
  timeZone,
  executor = dbReplica,
}: {
  start: Date
  end: Date
  timeZone: string
  executor?: DbClient
}): Promise<WorkspaceConsumptionReport> {
  assertValidTimezone(timeZone)
  const inLedgerPeriod = [gte(usageLog.createdAt, start), lt(usageLog.createdAt, end)]
  const modelRows = and(...inLedgerPeriod, inArray(usageLog.category, [...MODEL_USAGE_CATEGORIES]))
  const inRunPeriod = and(
    gte(workflowExecutionLogs.startedAt, start),
    lt(workflowExecutionLogs.startedAt, end)
  )

  const [tokenRows, userExecutionRows, tokenDayRows, workspaceExecutionRows, executionDayRows] =
    await Promise.all([
      executor
        .select({
          workspaceId: usageLog.workspaceId,
          userId: usageLog.userId,
          model: usageLog.description,
          promptTokens: sql<string>`SUM(${inputTokensSql})`,
          completionTokens: sql<string>`SUM(${outputTokensSql})`,
        })
        .from(usageLog)
        .where(modelRows)
        .groupBy(usageLog.workspaceId, usageLog.userId, usageLog.description),
      executor
        .select({
          userId: usageLog.userId,
          executions: sql<string>`COUNT(DISTINCT ${usageLog.executionId})`,
        })
        .from(usageLog)
        .where(
          and(...inLedgerPeriod, eq(usageLog.source, 'workflow'), isNotNull(usageLog.executionId))
        )
        .groupBy(usageLog.userId),
      executor
        .select({
          day: localDay(usageLog.createdAt, timeZone).as('day'),
          totalTokens: sql<string>`SUM(${LEDGER_TOKENS_SQL})`,
        })
        .from(usageLog)
        .where(modelRows)
        .groupBy(sql`day`),
      executor
        .select({
          workspaceId: workflowExecutionLogs.workspaceId,
          executions: sql<string>`COUNT(*)`,
        })
        .from(workflowExecutionLogs)
        .where(inRunPeriod)
        .groupBy(workflowExecutionLogs.workspaceId),
      executor
        .select({
          day: localDay(workflowExecutionLogs.startedAt, timeZone).as('day'),
          executions: sql<string>`COUNT(*)`,
        })
        .from(workflowExecutionLogs)
        .where(inRunPeriod)
        .groupBy(sql`day`),
    ])

  const totals = emptyTotals()
  const workspaces = new Map<string | null, WorkspaceConsumption>()
  const users = new Map<string, UserConsumption>()

  const workspaceEntry = (workspaceId: string | null): WorkspaceConsumption => {
    let entry = workspaces.get(workspaceId)
    if (!entry) {
      entry = {
        workspaceId,
        name: null,
        status: 'deleted',
        tokensByModel: {},
        ...emptyTotals(),
      }
      workspaces.set(workspaceId, entry)
    }
    return entry
  }
  const userEntry = (userId: string): UserConsumption => {
    let entry = users.get(userId)
    if (!entry) {
      entry = { userId, name: null, email: null, tokensByModel: {}, ...emptyTotals() }
      users.set(userId, entry)
    }
    return entry
  }

  for (const row of tokenRows) {
    const prompt = amount(row.promptTokens)
    const completion = amount(row.completionTokens)
    const model = modelName(row.model)
    totals.promptTokens += prompt
    totals.completionTokens += completion
    totals.totalTokens += prompt + completion
    addTokens(workspaceEntry(row.workspaceId), model, prompt, completion)
    addTokens(userEntry(row.userId), model, prompt, completion)
  }
  for (const row of workspaceExecutionRows) {
    const executions = amount(row.executions)
    totals.executions += executions
    workspaceEntry(row.workspaceId).executions += executions
  }
  for (const row of userExecutionRows) {
    userEntry(row.userId).executions += amount(row.executions)
  }

  const workspaceIds = [...workspaces.keys()].filter((id): id is string => id !== null)
  if (workspaceIds.length > 0) {
    const rows = await executor
      .select({ id: workspace.id, name: workspace.name, archivedAt: workspace.archivedAt })
      .from(workspace)
      .where(inArray(workspace.id, workspaceIds))
    for (const row of rows) {
      const entry = workspaces.get(row.id)
      if (!entry) continue
      entry.name = row.name
      entry.status = row.archivedAt ? 'archived' : 'active'
    }
  }

  const topUsers = [...users.values()].sort(byConsumption).slice(0, TOP_USERS)
  if (topUsers.length > 0) {
    const rows = await executor
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .where(
        inArray(
          user.id,
          topUsers.map((entry) => entry.userId)
        )
      )
    for (const row of rows) {
      const entry = users.get(row.id)
      if (!entry) continue
      entry.name = row.name
      entry.email = row.email
    }
  }

  const days = new Map<string, ConsumptionDay>()
  const dayEntry = (date: string): ConsumptionDay => {
    let entry = days.get(date)
    if (!entry) {
      entry = { date, executions: 0, totalTokens: 0 }
      days.set(date, entry)
    }
    return entry
  }
  for (const row of tokenDayRows) dayEntry(row.day).totalTokens += amount(row.totalTokens)
  for (const row of executionDayRows) dayEntry(row.day).executions += amount(row.executions)

  return {
    totals,
    workspaces: [...workspaces.values()].sort(byConsumption),
    users: topUsers,
    days: [...days.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
  }
}
