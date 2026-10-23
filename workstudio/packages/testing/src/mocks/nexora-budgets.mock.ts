import { vi } from 'vitest'

interface BudgetCheckLike {
  allowed: boolean
  reason?: string
  code?: string
  message?: string
  usage: number | null
  cap: number | null
}

/**
 * Controllable mock for `@/lib/nexora/consumption/budgets` (Nexora edition: monthly token
 * budgets). `checkBudget` admits by default; refuse a run with
 * `nexoraBudgetsMockFns.mockCheckBudget.mockResolvedValueOnce({ allowed: false, reason:
 * 'workspace', code: 'MONTHLY_BUDGET_EXCEEDED', message, usage, cap })`.
 */
export const nexoraBudgetsMockFns = {
  mockCheckBudget: vi.fn<
    (workspaceId: string, actor: { userId: string } | null) => Promise<BudgetCheckLike>
  >(async () => ({ allowed: true, usage: null, cap: null })),
  mockParseBudgets: vi.fn(() => ({
    instanceMonthlyTokens: null,
    workspaceMonthlyTokens: {},
    alertThreshold: 0.8,
    alerts: [],
  })),
  mockUpdateBudgets: vi.fn(),
  mockResetBudgetGateCache: vi.fn(),
}

/** Static mock module for `@/lib/nexora/consumption/budgets`. */
export const nexoraBudgetsMock = {
  checkBudget: nexoraBudgetsMockFns.mockCheckBudget,
  parseBudgets: nexoraBudgetsMockFns.mockParseBudgets,
  updateBudgets: nexoraBudgetsMockFns.mockUpdateBudgets,
  resetBudgetGateCache: nexoraBudgetsMockFns.mockResetBudgetGateCache,
}
