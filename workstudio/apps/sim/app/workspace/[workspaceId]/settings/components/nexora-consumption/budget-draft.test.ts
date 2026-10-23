import { describe, expect, it } from 'vitest'
import {
  type BudgetDraft,
  budgetAlerts,
  budgetChange,
  budgetLevel,
  draftFromBudgets,
  parseTokenCap,
} from '@/app/workspace/[workspaceId]/settings/components/nexora-consumption/budget-draft'

describe('budgetLevel', () => {
  it('warns from the threshold on and reports a cap reached at exactly the cap', () => {
    expect(budgetLevel(799, 1_000, 0.8)).toBe('ok')
    expect(budgetLevel(800, 1_000, 0.8)).toBe('warning')
    expect(budgetLevel(999, 1_000, 0.8)).toBe('warning')
    expect(budgetLevel(1_000, 1_000, 0.8)).toBe('exceeded')
    expect(budgetLevel(1_500, 1_000, 0.8)).toBe('exceeded')
  })
})

describe('budgetAlerts', () => {
  const overview = {
    budgets: {
      instanceMonthlyTokens: 10_000,
      workspaceMonthlyTokens: { 'ws-ventes': 1_000, 'ws-compta': 1_000, 'ws-rh': 5_000 },
      alertThreshold: 0.8,
    },
    usage: { instance: 8_500, workspaces: { 'ws-ventes': 1_200, 'ws-compta': 100 } },
    workspaces: [
      { id: 'ws-ventes', name: 'Ventes', status: 'active' as const },
      { id: 'ws-compta', name: 'Comptabilité', status: 'active' as const },
    ],
  }

  it('lists every scope at or past its threshold, the instance first, with its workspace name', () => {
    expect(budgetAlerts(overview)).toEqual([
      { scope: 'instance', name: null, usage: 8_500, cap: 10_000, level: 'warning' },
      { scope: 'workspace', name: 'Ventes', usage: 1_200, cap: 1_000, level: 'exceeded' },
    ])
  })

  it('treats a capped workspace with no usage this month as within budget', () => {
    expect(budgetAlerts(overview).some((alert) => alert.name === 'ws-rh')).toBe(false)
  })

  it('says nothing when no cap is set', () => {
    expect(
      budgetAlerts({
        ...overview,
        budgets: { instanceMonthlyTokens: null, workspaceMonthlyTokens: {}, alertThreshold: 0.8 },
      })
    ).toEqual([])
  })
})

describe('parseTokenCap', () => {
  it('reads a cap typed the French way, with spaces between thousands', () => {
    expect(parseTokenCap('1 000 000')).toBe(1_000_000)
    expect(parseTokenCap('2 500 000')).toBe(2_500_000)
    expect(parseTokenCap(' 42 ')).toBe(42)
  })

  it('reads an empty field as no cap', () => {
    expect(parseTokenCap('')).toBeNull()
    expect(parseTokenCap('   ')).toBeNull()
  })

  it('refuses a cap that is not a whole number of tokens above zero', () => {
    for (const input of ['0', '-5', '1,5', '1.5', 'abc', '1e6', '9999999999999999']) {
      expect(parseTokenCap(input)).toBe('invalid')
    }
  })
})

describe('budgetChange', () => {
  const budgets = {
    instanceMonthlyTokens: 1_000_000,
    workspaceMonthlyTokens: { 'ws-ventes': 50_000, 'ws-compta': 20_000 },
    alertThreshold: 0.8,
  }

  function edit(update: (draft: BudgetDraft) => BudgetDraft) {
    return budgetChange(budgets, update(draftFromBudgets(budgets)))
  }

  it('finds nothing to save in an untouched draft', () => {
    expect(edit((draft) => draft)).toBeNull()
  })

  it('removes the cap of a workspace row taken out of the draft', () => {
    expect(
      edit((draft) => ({
        ...draft,
        workspaceCaps: draft.workspaceCaps.filter((row) => row.workspaceId !== 'ws-compta'),
      }))
    ).toEqual({ workspaceMonthlyTokens: { 'ws-compta': null } })
  })

  it('sends only what changed: a new workspace cap, a cleared instance cap, a new threshold', () => {
    expect(
      edit((draft) => ({
        instanceCap: '',
        threshold: '90',
        workspaceCaps: [...draft.workspaceCaps, { workspaceId: 'ws-rh', cap: '5 000' }],
      }))
    ).toEqual({
      instanceMonthlyTokens: null,
      alertThreshold: 0.9,
      workspaceMonthlyTokens: { 'ws-rh': 5_000 },
    })
  })

  it('blocks saving an invalid cap, a workspace row left without a cap, or a threshold out of range', () => {
    expect(edit((draft) => ({ ...draft, instanceCap: '-1' }))).toBe('invalid')
    expect(
      edit((draft) => ({
        ...draft,
        workspaceCaps: [...draft.workspaceCaps, { workspaceId: 'ws-rh', cap: '' }],
      }))
    ).toBe('invalid')
    for (const threshold of ['0', '4', '101', '80,5', '']) {
      expect(edit((draft) => ({ ...draft, threshold }))).toBe('invalid')
    }
  })
})
