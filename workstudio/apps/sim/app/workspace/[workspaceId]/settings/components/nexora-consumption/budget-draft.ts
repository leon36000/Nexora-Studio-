import { isApiClientError } from '@/lib/api/client/errors'
import type { UpdateNexoraBudgetsBody } from '@/lib/api/contracts/nexora-consumption'

/** The largest cap the server accepts, in tokens. */
const MAX_MONTHLY_TOKENS = 1e15
const MIN_THRESHOLD_PERCENT = 5

export type BudgetLevel = 'ok' | 'warning' | 'exceeded'

interface Budgets {
  instanceMonthlyTokens: number | null
  workspaceMonthlyTokens: Record<string, number>
  /** Share of a cap, above 0 and at most 1. */
  alertThreshold: number
}

interface BudgetOverview {
  budgets: Budgets
  usage: { instance: number; workspaces: Record<string, number> }
  workspaces: ReadonlyArray<{ id: string; name: string }>
}

export interface BudgetAlertRow {
  scope: 'instance' | 'workspace'
  /** The workspace's name (its id when it no longer exists), `null` for the instance. */
  name: string | null
  usage: number
  cap: number
  level: Exclude<BudgetLevel, 'ok'>
}

/** Where usage stands against a cap: refusals start at the cap itself, as the gate does. */
export function budgetLevel(usage: number, cap: number, threshold: number): BudgetLevel {
  if (usage >= cap) return 'exceeded'
  if (usage >= cap * threshold) return 'warning'
  return 'ok'
}

/** Every cap this month's usage has reached the alert threshold of, the instance first. */
export function budgetAlerts(overview: BudgetOverview): BudgetAlertRow[] {
  const { budgets, usage } = overview
  const alerts: BudgetAlertRow[] = []
  if (budgets.instanceMonthlyTokens !== null) {
    const level = budgetLevel(usage.instance, budgets.instanceMonthlyTokens, budgets.alertThreshold)
    if (level !== 'ok') {
      alerts.push({
        scope: 'instance',
        name: null,
        usage: usage.instance,
        cap: budgets.instanceMonthlyTokens,
        level,
      })
    }
  }
  const names = new Map(overview.workspaces.map((workspace) => [workspace.id, workspace.name]))
  for (const [workspaceId, cap] of Object.entries(budgets.workspaceMonthlyTokens)) {
    const used = usage.workspaces[workspaceId] ?? 0
    const level = budgetLevel(used, cap, budgets.alertThreshold)
    if (level !== 'ok') {
      alerts.push({
        scope: 'workspace',
        name: names.get(workspaceId) ?? workspaceId,
        usage: used,
        cap,
        level,
      })
    }
  }
  return alerts
}

/**
 * A cap as typed: digits, optionally grouped by spaces (`1 000 000`, as French formatting writes
 * it). Empty means no cap; anything that is not a whole number of tokens above zero is invalid.
 */
export function parseTokenCap(input: string): number | null | 'invalid' {
  const digits = input.replace(/[\s  ]/g, '')
  if (digits === '') return null
  if (!/^\d+$/.test(digits)) return 'invalid'
  const tokens = Number(digits)
  if (tokens === 0 || tokens > MAX_MONTHLY_TOKENS) return 'invalid'
  return tokens
}

function parseThresholdPercent(input: string): number | 'invalid' {
  const digits = input.trim()
  if (!/^\d+$/.test(digits)) return 'invalid'
  const percent = Number(digits)
  if (percent < MIN_THRESHOLD_PERCENT) return 'invalid'
  if (percent > 100) return 'invalid'
  return percent / 100
}

export interface BudgetDraft {
  instanceCap: string
  /** Whole percent, 5 to 100. */
  threshold: string
  workspaceCaps: Array<{ workspaceId: string; cap: string }>
}

export function draftFromBudgets(budgets: Budgets): BudgetDraft {
  return {
    instanceCap:
      budgets.instanceMonthlyTokens === null ? '' : String(budgets.instanceMonthlyTokens),
    threshold: String(Math.round(budgets.alertThreshold * 100)),
    workspaceCaps: Object.entries(budgets.workspaceMonthlyTokens).map(([workspaceId, cap]) => ({
      workspaceId,
      cap: String(cap),
    })),
  }
}

/**
 * What saving `draft` changes in `budgets`: only the fields that differ, a removed workspace row
 * as a `null` cap. `null` when nothing changed, `'invalid'` while a field cannot be saved
 * (a workspace row needs a cap; removing the row is how a workspace's cap is cleared).
 */
export function budgetChange(
  budgets: Budgets,
  draft: BudgetDraft
): UpdateNexoraBudgetsBody | null | 'invalid' {
  const instanceCap = parseTokenCap(draft.instanceCap)
  const threshold = parseThresholdPercent(draft.threshold)
  if (instanceCap === 'invalid' || threshold === 'invalid') return 'invalid'

  const change: UpdateNexoraBudgetsBody = {}
  if (instanceCap !== budgets.instanceMonthlyTokens) change.instanceMonthlyTokens = instanceCap
  if (Math.abs(threshold - budgets.alertThreshold) > 1e-9) change.alertThreshold = threshold

  const workspaceChange: Record<string, number | null> = {}
  const kept = new Set<string>()
  for (const row of draft.workspaceCaps) {
    const cap = parseTokenCap(row.cap)
    if (cap === null || cap === 'invalid') return 'invalid'
    kept.add(row.workspaceId)
    if (budgets.workspaceMonthlyTokens[row.workspaceId] !== cap) {
      workspaceChange[row.workspaceId] = cap
    }
  }
  for (const workspaceId of Object.keys(budgets.workspaceMonthlyTokens)) {
    if (!kept.has(workspaceId)) workspaceChange[workspaceId] = null
  }
  if (Object.keys(workspaceChange).length > 0) change.workspaceMonthlyTokens = workspaceChange

  return Object.keys(change).length > 0 ? change : null
}

/** Why saving the budgets failed, as a message key: the server's own wording is in English. */
export function budgetSaveErrorKey(
  error: unknown
): 'invalid' | 'forbidden' | 'unavailable' | 'unknown' {
  if (!isApiClientError(error)) return 'unknown'
  if (error.status === 400) return 'invalid'
  if (error.status === 401 || error.status === 403) return 'forbidden'
  if (error.status === 404) return 'unavailable'
  return 'unknown'
}
