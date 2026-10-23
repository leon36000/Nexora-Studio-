import { queueTableRows, resetDbChainMock } from '@sim/testing/mocks/database.mock'
import { schemaMock } from '@sim/testing/mocks/schema.mock'
import { beforeEach, describe, expect, it } from 'vitest'
import { readWorkspaceConsumption } from '@/lib/nexora/consumption/by-workspace'

const PERIOD = {
  start: new Date('2026-09-30T22:00:00Z'),
  end: new Date('2026-10-31T23:00:00Z'),
  timeZone: 'Europe/Paris',
}

interface Ledger {
  tokens?: Array<{
    workspaceId: string | null
    userId: string
    model: string
    promptTokens: number | string
    completionTokens: number | string
  }>
  userExecutions?: Array<{ userId: string; executions: number | string }>
  tokenDays?: Array<{ day: string; totalTokens: number | string }>
  workspaceExecutions?: Array<{ workspaceId: string; executions: number | string }>
  executionDays?: Array<{ day: string; executions: number | string }>
  workspaces?: Array<{ id: string; name: string; archivedAt: Date | null }>
  users?: Array<{ id: string; name: string; email: string }>
}

/** Queues the aggregate rows in the order the report reads them. */
function queueLedger(ledger: Ledger) {
  queueTableRows(schemaMock.usageLog, ledger.tokens ?? [])
  queueTableRows(schemaMock.usageLog, ledger.userExecutions ?? [])
  queueTableRows(schemaMock.usageLog, ledger.tokenDays ?? [])
  queueTableRows(schemaMock.workflowExecutionLogs, ledger.workspaceExecutions ?? [])
  queueTableRows(schemaMock.workflowExecutionLogs, ledger.executionDays ?? [])
  queueTableRows(schemaMock.workspace, ledger.workspaces ?? [])
  queueTableRows(schemaMock.user, ledger.users ?? [])
}

beforeEach(() => {
  resetDbChainMock()
})

describe('readWorkspaceConsumption', () => {
  it('keeps a deleted workspace in the instance totals, shown as deleted', async () => {
    queueLedger({
      tokens: [
        {
          workspaceId: 'ws-1',
          userId: 'u-1',
          model: 'vllm/mistral-small',
          promptTokens: '100',
          completionTokens: '50',
        },
        {
          workspaceId: null,
          userId: 'u-2',
          model: 'vllm/mistral-small',
          promptTokens: '700',
          completionTokens: '300',
        },
        {
          workspaceId: 'ws-gone',
          userId: 'u-2',
          model: 'vllm/mistral-small',
          promptTokens: '20',
          completionTokens: '10',
        },
      ],
      workspaceExecutions: [{ workspaceId: 'ws-1', executions: '2' }],
      workspaces: [{ id: 'ws-1', name: 'Compta', archivedAt: null }],
    })

    const report = await readWorkspaceConsumption(PERIOD)

    expect(report.totals.totalTokens).toBe(1180)
    const deleted = report.workspaces.filter((w) => w.status === 'deleted')
    expect(deleted.reduce((sum, w) => sum + w.totalTokens, 0)).toBe(1030)
    expect(report.workspaces.find((w) => w.workspaceId === 'ws-1')).toMatchObject({
      name: 'Compta',
      status: 'active',
      totalTokens: 150,
      executions: 2,
    })
  })

  it('marks an archived workspace instead of dropping it', async () => {
    queueLedger({
      workspaceExecutions: [{ workspaceId: 'ws-old', executions: 3 }],
      workspaces: [{ id: 'ws-old', name: 'Ancien', archivedAt: new Date('2026-10-02T00:00:00Z') }],
    })
    const report = await readWorkspaceConsumption(PERIOD)
    expect(report.workspaces).toEqual([
      expect.objectContaining({ workspaceId: 'ws-old', status: 'archived', executions: 3 }),
    ])
  })

  it('counts a run that used no model as an execution without tokens', async () => {
    queueLedger({
      workspaceExecutions: [{ workspaceId: 'ws-1', executions: 4 }],
      workspaces: [{ id: 'ws-1', name: 'Compta', archivedAt: null }],
    })
    const report = await readWorkspaceConsumption(PERIOD)
    expect(report.totals).toEqual({
      executions: 4,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    })
    expect(report.workspaces[0]).toMatchObject({ executions: 4, totalTokens: 0, tokensByModel: {} })
  })

  it('merges a model called through its vllm/ id with the same model called directly', async () => {
    queueLedger({
      tokens: [
        {
          workspaceId: 'ws-1',
          userId: 'u-1',
          model: 'vllm/mistral-small',
          promptTokens: 10,
          completionTokens: 5,
        },
        {
          workspaceId: 'ws-1',
          userId: 'u-1',
          model: 'mistral-small',
          promptTokens: 1,
          completionTokens: 1,
        },
      ],
      workspaces: [{ id: 'ws-1', name: 'Compta', archivedAt: null }],
    })
    const report = await readWorkspaceConsumption(PERIOD)
    expect(report.workspaces[0].tokensByModel).toEqual({ 'mistral-small': 17 })
    expect(report.users[0].tokensByModel).toEqual({ 'mistral-small': 17 })
  })

  it('ranks people by tokens and keeps only the top 20', async () => {
    const tokens = Array.from({ length: 25 }, (_, i) => ({
      workspaceId: 'ws-1',
      userId: `u-${i}`,
      model: 'mistral-small',
      promptTokens: (i + 1) * 10,
      completionTokens: 0,
    }))
    queueLedger({
      tokens,
      userExecutions: [{ userId: 'u-24', executions: '6' }],
      workspaces: [{ id: 'ws-1', name: 'Compta', archivedAt: null }],
      users: [{ id: 'u-24', name: 'Alice', email: 'alice@example.fr' }],
    })
    const report = await readWorkspaceConsumption(PERIOD)
    expect(report.users).toHaveLength(20)
    expect(report.users[0]).toMatchObject({
      userId: 'u-24',
      name: 'Alice',
      email: 'alice@example.fr',
      totalTokens: 250,
      executions: 6,
    })
    expect(report.users.map((u) => u.userId)).not.toContain('u-0')
    expect(report.totals.totalTokens).toBe(tokens.reduce((sum, t) => sum + t.promptTokens, 0))
  })

  it('returns one row per local day with executions and tokens', async () => {
    queueLedger({
      tokenDays: [{ day: '2026-10-02', totalTokens: '30' }],
      executionDays: [
        { day: '2026-10-01', executions: 1 },
        { day: '2026-10-02', executions: '2' },
      ],
    })
    const report = await readWorkspaceConsumption(PERIOD)
    expect(report.days).toEqual([
      { date: '2026-10-01', executions: 1, totalTokens: 0 },
      { date: '2026-10-02', executions: 2, totalTokens: 30 },
    ])
  })
})
