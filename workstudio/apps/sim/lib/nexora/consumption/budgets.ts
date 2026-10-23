import { db } from '@sim/db'
import { member, organization, usageLog, user, workspace } from '@sim/db/schema'
import { createLogger } from '@sim/logger'
import { isOrgAdminRole } from '@sim/platform-authz/workspace'
import { getErrorMessage } from '@sim/utils/errors'
import { isRecordLike, toRecord } from '@sim/utils/object'
import { and, eq, gte, inArray, lt, sql } from 'drizzle-orm'
import { LRUCache } from 'lru-cache'
import { coalesceLocally } from '@/lib/concurrency/singleflight'
import { ADMISSION_REJECTION_CODE } from '@/lib/core/admission/rejection'
import { hasEmailService, sendEmail } from '@/lib/messaging/email/mailer'
import { LEDGER_TOKENS_SQL, MODEL_USAGE_CATEGORIES } from '@/lib/nexora/consumption/by-workspace'
import { instanceTimeZone, type MonthWindow, monthWindow } from '@/lib/nexora/consumption/period'
import { getInstanceOrganizationId } from '@/lib/organizations/instance-org'

/**
 * Nexora edition: monthly token budgets, for the whole instance and per workspace, kept in the
 * instance organization's `metadata.nexoraBudgets`. A month is the calendar month in the instance
 * time zone; its usage is the model tokens recorded in the usage ledger since the 1st (a run's
 * tokens land when it finishes, so runs in flight can take a workspace a little past its cap).
 *
 * {@link checkBudget} is the execution gate, called by `preprocessExecution` for new runs only.
 * Its caching, in the safe direction:
 *
 * - only an admission is cached, per workspace and month, for {@link BUDGET_ADMISSION_TTL_MS}
 *   ({@link NEAR_CAP_ADMISSION_TTL_MS} once usage passes the alert threshold). A refusal is read
 *   again on every run, so a raised cap applies on the very next run in every process;
 * - a lowered cap applies at once in the process that saved it ({@link updateBudgets} clears the
 *   cache there) and within the admission TTL in the others;
 * - a failed read is never cached: the run is let through (a budget is a cost guard, not a
 *   security boundary, and a database outage already stops executions elsewhere) and the next
 *   run reads again.
 *
 * Crossing the alert threshold, then the cap, is recorded once per month and cap for each scope
 * (for the administrators' banner) and e-mailed to the instance owners and admins when an e-mail
 * service is configured.
 */

const logger = createLogger('NexoraBudgets')

const METADATA_KEY = 'nexoraBudgets'
const DEFAULT_ALERT_THRESHOLD = 0.8
/** Which cap refused the run: the people refused can tell their administrator which to raise. */
const BUDGET_EXCEEDED_MESSAGE: Record<BudgetScope, string> = {
  workspace: 'Budget mensuel atteint pour cet espace : contactez votre administrateur.',
  instance: 'Budget mensuel de l’instance atteint : contactez votre administrateur.',
}

/** How long an admission far from every cap is served from cache. */
const BUDGET_ADMISSION_TTL_MS = 30_000
/** How long an admission past the alert threshold is served from cache. */
const NEAR_CAP_ADMISSION_TTL_MS = 5_000
/** Bounds a hung budget read; the ledger sum is one indexed scan of the current month. */
const BUDGET_READ_SETTLE_TIMEOUT_MS = 30_000

type BudgetScope = 'workspace' | 'instance'
type AlertLevel = 'threshold' | 'exhausted'

interface BudgetAlert {
  scope: BudgetScope
  /** Set when `scope` is `workspace`. */
  workspaceId: string | null
  level: AlertLevel
  /** `YYYY-MM` in the instance time zone. */
  month: string
  /** ISO instant the alert was raised. */
  at: string
  usage: number
  cap: number
}

export interface NexoraBudgets {
  /** Monthly token cap for the whole instance, `null` for none. */
  instanceMonthlyTokens: number | null
  /** Monthly token cap per workspace id. */
  workspaceMonthlyTokens: Record<string, number>
  /** Share of a cap (above 0, at most 1) at which administrators are alerted. */
  alertThreshold: number
  /** Alerts raised this month, one per scope and level. */
  alerts: BudgetAlert[]
}

export interface BudgetChange {
  instanceMonthlyTokens?: number | null
  /** A `null` cap removes that workspace's budget. */
  workspaceMonthlyTokens?: Record<string, number | null>
  alertThreshold?: number
}

export type BudgetCheck =
  | {
      allowed: true
      /** `admin`: an instance admin past a cap; `unavailable`: the budget could not be read. */
      reason?: 'admin' | 'unavailable'
      usage: number | null
      cap: number | null
    }
  | {
      allowed: false
      reason: BudgetScope
      code: typeof ADMISSION_REJECTION_CODE.MONTHLY_BUDGET_EXCEEDED
      message: string
      usage: number
      cap: number
    }

interface MonthlyUsage {
  workspace: number
  instance: number
}

interface BudgetSnapshot {
  organizationId: string | null
  budgets: NexoraBudgets | null
  usage: MonthlyUsage | null
}

function positiveTokens(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : null
}

function parseAlert(value: unknown): BudgetAlert[] {
  if (!isRecordLike(value)) return []
  const { scope, workspaceId, level, month, at, usage, cap } = value
  if (scope !== 'workspace' && scope !== 'instance') return []
  if (level !== 'threshold' && level !== 'exhausted') return []
  if (typeof month !== 'string' || typeof at !== 'string') return []
  if (typeof usage !== 'number' || typeof cap !== 'number') return []
  if (scope === 'workspace' && typeof workspaceId !== 'string') return []
  return [
    {
      scope,
      workspaceId: scope === 'workspace' ? (workspaceId as string) : null,
      level,
      month,
      at,
      usage,
      cap,
    },
  ]
}

/** Reads the budgets kept in `organization.metadata`, tolerating anything stored there. */
export function parseBudgets(metadata: unknown): NexoraBudgets {
  const stored = isRecordLike(metadata) ? metadata[METADATA_KEY] : undefined
  const record = toRecord(stored)
  const workspaceMonthlyTokens: Record<string, number> = {}
  for (const [workspaceId, cap] of Object.entries(toRecord(record.workspaceMonthlyTokens))) {
    const tokens = positiveTokens(cap)
    if (tokens !== null) workspaceMonthlyTokens[workspaceId] = tokens
  }
  const threshold = record.alertThreshold
  return {
    instanceMonthlyTokens: positiveTokens(record.instanceMonthlyTokens),
    workspaceMonthlyTokens,
    alertThreshold:
      typeof threshold === 'number' && threshold > 0 && threshold <= 1
        ? threshold
        : DEFAULT_ALERT_THRESHOLD,
    alerts: Array.isArray(record.alerts) ? record.alerts.flatMap(parseAlert) : [],
  }
}

function applyChange(budgets: NexoraBudgets, change: BudgetChange): NexoraBudgets {
  const workspaceMonthlyTokens = { ...budgets.workspaceMonthlyTokens }
  for (const [workspaceId, cap] of Object.entries(change.workspaceMonthlyTokens ?? {})) {
    const tokens = positiveTokens(cap)
    if (tokens === null) delete workspaceMonthlyTokens[workspaceId]
    else workspaceMonthlyTokens[workspaceId] = tokens
  }
  return {
    ...budgets,
    instanceMonthlyTokens:
      change.instanceMonthlyTokens === undefined
        ? budgets.instanceMonthlyTokens
        : positiveTokens(change.instanceMonthlyTokens),
    workspaceMonthlyTokens,
    alertThreshold:
      change.alertThreshold !== undefined && change.alertThreshold > 0 && change.alertThreshold <= 1
        ? change.alertThreshold
        : budgets.alertThreshold,
  }
}

const admissionCache = new LRUCache<string, BudgetCheck>({
  max: 10_000,
  ttl: BUDGET_ADMISSION_TTL_MS,
})

/** Drops every cached admission. Test seam; production clears it through {@link updateBudgets}. */
export function resetBudgetGateCache(): void {
  admissionCache.clear()
}

/** The instance budgets, read fresh, or `null` without an instance organization. */
export async function readBudgets(): Promise<(NexoraBudgets & { organizationId: string }) | null> {
  const organizationId = await getInstanceOrganizationId()
  if (!organizationId) return null
  const [row] = await db
    .select({ metadata: organization.metadata })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1)
  return { ...parseBudgets(row?.metadata), organizationId }
}

/**
 * Applies a change under a row lock, keeping every other metadata key, then drops this
 * process's cached admissions so a lowered cap applies on the next run here.
 */
export async function updateBudgets(
  organizationId: string,
  change: BudgetChange
): Promise<NexoraBudgets> {
  const budgets = await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ metadata: organization.metadata })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .for('update')
      .limit(1)
    const next = applyChange(parseBudgets(row?.metadata), change)
    await tx
      .update(organization)
      .set({ metadata: { ...toRecord(row?.metadata), [METADATA_KEY]: next } })
      .where(eq(organization.id, organizationId))
    return next
  })
  admissionCache.clear()
  return budgets
}

async function readMonthlyUsage(workspaceId: string, window: MonthWindow): Promise<MonthlyUsage> {
  const [row] = await db
    .select({
      workspaceTokens: sql<string>`COALESCE(SUM(${LEDGER_TOKENS_SQL}) FILTER (WHERE ${usageLog.workspaceId} = ${workspaceId}), 0)`,
      instanceTokens: sql<string>`COALESCE(SUM(${LEDGER_TOKENS_SQL}), 0)`,
    })
    .from(usageLog)
    .where(
      and(
        gte(usageLog.createdAt, window.start),
        lt(usageLog.createdAt, window.end),
        inArray(usageLog.category, [...MODEL_USAGE_CATEGORIES])
      )
    )
  return {
    workspace: Number.parseFloat(String(row?.workspaceTokens ?? '0')) || 0,
    instance: Number.parseFloat(String(row?.instanceTokens ?? '0')) || 0,
  }
}

interface ScopeStanding {
  scope: BudgetScope
  usage: number
  cap: number
}

/** Each cap that applies to the workspace, the workspace's own first. */
function standings(
  budgets: NexoraBudgets,
  usage: MonthlyUsage,
  workspaceId: string
): ScopeStanding[] {
  const result: ScopeStanding[] = []
  const workspaceCap = budgets.workspaceMonthlyTokens[workspaceId]
  if (workspaceCap !== undefined) {
    result.push({ scope: 'workspace', usage: usage.workspace, cap: workspaceCap })
  }
  if (budgets.instanceMonthlyTokens !== null) {
    result.push({ scope: 'instance', usage: usage.instance, cap: budgets.instanceMonthlyTokens })
  }
  return result
}

function sameSlot(a: BudgetAlert, b: BudgetAlert): boolean {
  return a.scope === b.scope && a.workspaceId === b.workspaceId && a.level === b.level
}

function alreadyRaised(existing: readonly BudgetAlert[], alert: BudgetAlert): boolean {
  return existing.some(
    (entry) => sameSlot(entry, alert) && entry.month === alert.month && entry.cap === alert.cap
  )
}

/**
 * Records the alerts no one recorded yet, re-reading under a row lock so two processes crossing
 * the threshold together record (and e-mail) it once. Returns the alerts this call recorded.
 */
async function recordAlerts(
  organizationId: string,
  candidates: BudgetAlert[],
  month: string
): Promise<BudgetAlert[]> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ metadata: organization.metadata })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .for('update')
      .limit(1)
    if (!row) return []
    const current = parseBudgets(row.metadata)
    const fresh = candidates.filter((alert) => !alreadyRaised(current.alerts, alert))
    if (fresh.length === 0) return []
    const alerts = [
      ...current.alerts.filter(
        (entry) => entry.month === month && !fresh.some((alert) => sameSlot(entry, alert))
      ),
      ...fresh,
    ]
    await tx
      .update(organization)
      .set({ metadata: { ...toRecord(row.metadata), [METADATA_KEY]: { ...current, alerts } } })
      .where(eq(organization.id, organizationId))
    return fresh
  })
}

const frenchNumber = new Intl.NumberFormat('fr-FR')

function alertEmail(alert: BudgetAlert, workspaceName: string | null) {
  const subject =
    alert.scope === 'instance'
      ? 'le budget mensuel de l’instance'
      : `le budget mensuel de l’espace « ${workspaceName ?? alert.workspaceId} »`
  const figures = `${frenchNumber.format(alert.usage)} jetons sur ${frenchNumber.format(alert.cap)} (${alert.month})`
  const text =
    alert.level === 'exhausted'
      ? `Bonjour,\n\nNexora WorkStudio : ${subject} est atteint, ${figures}. Les nouvelles exécutions sont refusées jusqu’au mois prochain, sauf si un administrateur relève le plafond dans Réglages › Consommation.\n`
      : `Bonjour,\n\nNexora WorkStudio : ${subject} est utilisé à ${Math.floor((alert.usage / alert.cap) * 100)} %, ${figures}. À 100 %, les nouvelles exécutions seront refusées. Vous pouvez relever le plafond dans Réglages › Consommation.\n`
  return {
    subject: `Nexora WorkStudio : ${alert.level === 'exhausted' ? 'budget mensuel atteint' : 'alerte de budget mensuel'}`,
    text,
  }
}

async function emailAlerts(organizationId: string, alerts: BudgetAlert[]): Promise<void> {
  if (!hasEmailService()) return
  const admins = await db
    .select({ email: user.email, name: user.name })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(and(eq(member.organizationId, organizationId), inArray(member.role, ['owner', 'admin'])))
  const to = admins.map((admin) => admin.email).filter(Boolean)
  if (to.length === 0) return
  const workspaceId = alerts.find((alert) => alert.workspaceId)?.workspaceId
  const [named] = workspaceId
    ? await db
        .select({ name: workspace.name })
        .from(workspace)
        .where(eq(workspace.id, workspaceId))
        .limit(1)
    : []
  for (const alert of alerts) {
    const { subject, text } = alertEmail(alert, named?.name ?? null)
    await sendEmail({ to, subject, text, emailType: 'notifications' })
  }
}

/** Records (and e-mails) the thresholds this workspace's usage crossed. Never throws. */
async function raiseAlerts(
  organizationId: string,
  budgets: NexoraBudgets,
  usage: MonthlyUsage,
  workspaceId: string,
  window: MonthWindow,
  now: Date
): Promise<void> {
  const candidates: BudgetAlert[] = []
  for (const standing of standings(budgets, usage, workspaceId)) {
    const levels: AlertLevel[] = []
    if (standing.usage >= standing.cap * budgets.alertThreshold) levels.push('threshold')
    if (standing.usage >= standing.cap) levels.push('exhausted')
    for (const level of levels) {
      const alert: BudgetAlert = {
        scope: standing.scope,
        workspaceId: standing.scope === 'workspace' ? workspaceId : null,
        level,
        month: window.month,
        at: now.toISOString(),
        usage: standing.usage,
        cap: standing.cap,
      }
      if (!alreadyRaised(budgets.alerts, alert)) candidates.push(alert)
    }
  }
  if (candidates.length === 0) return
  try {
    const recorded = await recordAlerts(organizationId, candidates, window.month)
    if (recorded.length === 0) return
    logger.info('Monthly budget alert raised', {
      alerts: recorded.map(({ scope, workspaceId: id, level }) => ({ scope, id, level })),
    })
    void emailAlerts(organizationId, recorded).catch((error) =>
      logger.error('Failed to e-mail a monthly budget alert', { error: getErrorMessage(error) })
    )
  } catch (error) {
    logger.error('Failed to record a monthly budget alert', { error: getErrorMessage(error) })
  }
}

async function readSnapshot(
  workspaceId: string,
  window: MonthWindow,
  now: Date
): Promise<BudgetSnapshot> {
  const budgetsRow = await readBudgets()
  if (!budgetsRow) return { organizationId: null, budgets: null, usage: null }
  const { organizationId, ...budgets } = budgetsRow
  if (standings(budgets, { workspace: 0, instance: 0 }, workspaceId).length === 0) {
    return { organizationId, budgets, usage: null }
  }
  const usage = await readMonthlyUsage(workspaceId, window)
  await raiseAlerts(organizationId, budgets, usage, workspaceId, window, now)
  return { organizationId, budgets, usage }
}

async function isInstanceAdmin(userId: string, organizationId: string): Promise<boolean> {
  const [row] = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
    .limit(1)
  return isOrgAdminRole(row?.role)
}

/**
 * Whether a new execution of `workspaceId` may start under this month's budgets. `actor` is the
 * person who launched the run themselves (an interactive run or a personal key), `null` for a
 * background run (schedule, webhook, deployed chat): an instance owner or admin acting in person
 * is never blocked, since they can raise the cap, while a background run is, whoever owns it.
 * Never throws.
 */
export async function checkBudget(
  workspaceId: string,
  actor: { userId: string } | null,
  { now = new Date(), timeZone = instanceTimeZone() }: { now?: Date; timeZone?: string } = {}
): Promise<BudgetCheck> {
  const window = monthWindow(now, timeZone)
  const key = `${window.month}:${workspaceId}`
  const cached = admissionCache.get(key)
  if (cached !== undefined) return cached

  let snapshot: BudgetSnapshot
  try {
    snapshot = await coalesceLocally(
      `nexora-budget:${key}`,
      () => readSnapshot(workspaceId, window, now),
      BUDGET_READ_SETTLE_TIMEOUT_MS
    )
  } catch (error) {
    logger.warn('Monthly budget could not be read; letting the execution through', {
      workspaceId,
      error: getErrorMessage(error),
    })
    return { allowed: true, reason: 'unavailable', usage: null, cap: null }
  }

  const { organizationId, budgets, usage } = snapshot
  const applicable = budgets && usage ? standings(budgets, usage, workspaceId) : []
  const exceeded = applicable.find((standing) => standing.usage >= standing.cap)
  if (!exceeded || !organizationId || !budgets) {
    const shown = applicable[0]
    const admission: BudgetCheck = {
      allowed: true,
      usage: shown?.usage ?? null,
      cap: shown?.cap ?? null,
    }
    const nearCap = applicable.some(
      (standing) => standing.usage >= standing.cap * (budgets?.alertThreshold ?? 1)
    )
    admissionCache.set(key, admission, {
      ttl: nearCap ? NEAR_CAP_ADMISSION_TTL_MS : BUDGET_ADMISSION_TTL_MS,
    })
    return admission
  }

  if (actor) {
    const admin = await isInstanceAdmin(actor.userId, organizationId).catch((error) => {
      logger.warn('Could not check whether the actor is an instance admin', {
        error: getErrorMessage(error),
      })
      return false
    })
    if (admin) return { allowed: true, reason: 'admin', usage: exceeded.usage, cap: exceeded.cap }
  }
  return {
    allowed: false,
    reason: exceeded.scope,
    code: ADMISSION_REJECTION_CODE.MONTHLY_BUDGET_EXCEEDED,
    message: BUDGET_EXCEEDED_MESSAGE[exceeded.scope],
    usage: exceeded.usage,
    cap: exceeded.cap,
  }
}
