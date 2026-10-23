import { flushMacrotask } from '@sim/testing/helpers/async'
import { dbChainMockFns, queueTableRows, resetDbChainMock } from '@sim/testing/mocks/database.mock'
import { emailMailerMock, emailMailerMockFns } from '@sim/testing/mocks/email-mailer.mock'
import { instanceOrgMock, instanceOrgMockFns } from '@sim/testing/mocks/instance-org.mock'
import { schemaMock } from '@sim/testing/mocks/schema.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  checkBudget,
  parseBudgets,
  resetBudgetGateCache,
  updateBudgets,
} from '@/lib/nexora/consumption/budgets'

vi.mock('@/lib/organizations/instance-org', () => instanceOrgMock)
vi.mock('@/lib/messaging/email/mailer', () => emailMailerMock)

const NOW = new Date('2026-10-23T10:00:00Z')
const OPTIONS = { now: NOW, timeZone: 'Europe/Paris' }
const MONTH = '2026-10'
const ADMIN = { id: 'admin-1', email: 'admin@pme.fr', name: 'Admin' }

interface StoredBudgets {
  instanceMonthlyTokens?: number | null
  workspaceMonthlyTokens?: Record<string, number>
  alertThreshold?: number
  alerts?: unknown[]
}

function queueBudgets(budgets: StoredBudgets, other: Record<string, unknown> = {}) {
  queueTableRows(schemaMock.organization, [{ metadata: { ...other, nexoraBudgets: budgets } }])
}

function queueUsage(workspaceTokens: number, instanceTokens = workspaceTokens) {
  queueTableRows(schemaMock.usageLog, [
    { workspaceTokens: String(workspaceTokens), instanceTokens: String(instanceTokens) },
  ])
}

/** The metadata the last `update(organization).set(...)` wrote. */
function writtenMetadata(): Record<string, unknown> | undefined {
  const calls = dbChainMockFns.set.mock.calls
  return (calls.at(-1)?.[0] as { metadata?: Record<string, unknown> } | undefined)?.metadata
}

beforeEach(() => {
  resetDbChainMock()
  resetBudgetGateCache()
  instanceOrgMockFns.mockGetInstanceOrganizationId.mockReset()
  instanceOrgMockFns.mockGetInstanceOrganizationId.mockResolvedValue('org-instance')
  emailMailerMockFns.mockHasEmailService.mockReset()
  emailMailerMockFns.mockHasEmailService.mockReturnValue(true)
  emailMailerMockFns.mockSendEmail.mockReset()
  emailMailerMockFns.mockSendEmail.mockResolvedValue({ success: true, message: 'sent' })
})

describe('checkBudget', () => {
  it('allows and alerts nobody below the threshold', async () => {
    queueBudgets({ workspaceMonthlyTokens: { 'ws-1': 1_000 } })
    queueUsage(500)

    const result = await checkBudget('ws-1', null, OPTIONS)
    await flushMacrotask()

    expect(result).toEqual({ allowed: true, usage: 500, cap: 1_000 })
    expect(dbChainMockFns.set).not.toHaveBeenCalled()
    expect(emailMailerMockFns.mockSendEmail).not.toHaveBeenCalled()
  })

  it('records the 80 % alert for the month and e-mails the instance admins', async () => {
    queueBudgets({ workspaceMonthlyTokens: { 'ws-1': 1_000 } })
    queueUsage(850)
    queueBudgets({ workspaceMonthlyTokens: { 'ws-1': 1_000 } })
    queueTableRows(schemaMock.member, [{ email: ADMIN.email, name: ADMIN.name }])

    const result = await checkBudget('ws-1', null, OPTIONS)
    await flushMacrotask()

    expect(result.allowed).toBe(true)
    const stored = parseBudgets(writtenMetadata())
    expect(stored.alerts).toEqual([
      expect.objectContaining({
        scope: 'workspace',
        workspaceId: 'ws-1',
        level: 'threshold',
        month: MONTH,
        usage: 850,
        cap: 1_000,
      }),
    ])
    expect(emailMailerMockFns.mockSendEmail).toHaveBeenCalledTimes(1)
    expect(emailMailerMockFns.mockSendEmail.mock.calls[0][0]).toMatchObject({ to: [ADMIN.email] })
  })

  it('does not alert twice in the same month for the same cap', async () => {
    const alreadyAlerted = {
      workspaceMonthlyTokens: { 'ws-1': 1_000 },
      alerts: [
        {
          scope: 'workspace',
          workspaceId: 'ws-1',
          level: 'threshold',
          month: MONTH,
          at: '2026-10-20T08:00:00.000Z',
          usage: 810,
          cap: 1_000,
        },
      ],
    }
    queueBudgets(alreadyAlerted)
    queueUsage(900)
    queueBudgets(alreadyAlerted)

    await checkBudget('ws-1', null, OPTIONS)
    await flushMacrotask()

    expect(dbChainMockFns.set).not.toHaveBeenCalled()
    expect(emailMailerMockFns.mockSendEmail).not.toHaveBeenCalled()
  })

  it('sends nothing when another process recorded the alert first', async () => {
    queueBudgets({ workspaceMonthlyTokens: { 'ws-1': 1_000 } })
    queueUsage(850)
    queueBudgets({
      workspaceMonthlyTokens: { 'ws-1': 1_000 },
      alerts: [
        {
          scope: 'workspace',
          workspaceId: 'ws-1',
          level: 'threshold',
          month: MONTH,
          at: NOW.toISOString(),
          usage: 840,
          cap: 1_000,
        },
      ],
    })

    await checkBudget('ws-1', null, OPTIONS)
    await flushMacrotask()

    expect(dbChainMockFns.set).not.toHaveBeenCalled()
    expect(emailMailerMockFns.mockSendEmail).not.toHaveBeenCalled()
  })

  it('still records the alert for the banner when no e-mail service is configured', async () => {
    emailMailerMockFns.mockHasEmailService.mockReturnValue(false)
    queueBudgets({ workspaceMonthlyTokens: { 'ws-1': 1_000 } })
    queueUsage(850)
    queueBudgets({ workspaceMonthlyTokens: { 'ws-1': 1_000 } })

    await checkBudget('ws-1', null, OPTIONS)
    await flushMacrotask()

    expect(parseBudgets(writtenMetadata()).alerts).toHaveLength(1)
    expect(emailMailerMockFns.mockSendEmail).not.toHaveBeenCalled()
  })

  it('refuses a new execution once the workspace reached its cap, in French', async () => {
    queueBudgets({
      workspaceMonthlyTokens: { 'ws-1': 1_000 },
      alerts: [
        {
          scope: 'workspace',
          workspaceId: 'ws-1',
          level: 'threshold',
          month: MONTH,
          at: NOW.toISOString(),
          usage: 850,
          cap: 1_000,
        },
        {
          scope: 'workspace',
          workspaceId: 'ws-1',
          level: 'exhausted',
          month: MONTH,
          at: NOW.toISOString(),
          usage: 1_000,
          cap: 1_000,
        },
      ],
    })
    queueUsage(1_000)

    const result = await checkBudget('ws-1', null, OPTIONS)

    expect(result).toEqual({
      allowed: false,
      reason: 'workspace',
      code: 'MONTHLY_BUDGET_EXCEEDED',
      message: 'Budget mensuel atteint pour cet espace : contactez votre administrateur.',
      usage: 1_000,
      cap: 1_000,
    })
  })

  it('refuses every workspace once the instance reached its cap', async () => {
    queueBudgets({ instanceMonthlyTokens: 10_000 })
    queueUsage(10, 10_500)

    const result = await checkBudget('ws-quiet', null, OPTIONS)

    expect(result).toMatchObject({
      allowed: false,
      reason: 'instance',
      code: 'MONTHLY_BUDGET_EXCEEDED',
      message: 'Budget mensuel de l’instance atteint : contactez votre administrateur.',
      usage: 10_500,
      cap: 10_000,
    })
  })

  it('allows again as soon as the cap is raised: a refusal is never served from cache', async () => {
    queueBudgets({ workspaceMonthlyTokens: { 'ws-1': 1_000 } })
    queueUsage(1_200)
    expect((await checkBudget('ws-1', null, OPTIONS)).allowed).toBe(false)

    queueBudgets({ workspaceMonthlyTokens: { 'ws-1': 5_000 } })
    queueUsage(1_200)
    expect(await checkBudget('ws-1', null, OPTIONS)).toEqual({
      allowed: true,
      usage: 1_200,
      cap: 5_000,
    })
  })

  it('applies a lowered cap at once in the process that saved it', async () => {
    queueBudgets({ workspaceMonthlyTokens: { 'ws-1': 5_000 } })
    queueUsage(1_200)
    expect((await checkBudget('ws-1', null, OPTIONS)).allowed).toBe(true)

    queueBudgets({ workspaceMonthlyTokens: { 'ws-1': 5_000 } })
    await updateBudgets('org-instance', { workspaceMonthlyTokens: { 'ws-1': 1_000 } })

    queueBudgets({ workspaceMonthlyTokens: { 'ws-1': 1_000 } })
    queueUsage(1_200)
    expect((await checkBudget('ws-1', null, OPTIONS)).allowed).toBe(false)
  })

  it('lets an instance admin run past the cap', async () => {
    queueBudgets({ workspaceMonthlyTokens: { 'ws-1': 1_000 } })
    queueUsage(1_500)
    queueTableRows(schemaMock.member, [{ role: 'admin' }])

    const result = await checkBudget('ws-1', { userId: ADMIN.id }, OPTIONS)

    expect(result).toEqual({ allowed: true, reason: 'admin', usage: 1_500, cap: 1_000 })
  })

  it('still refuses a member who is not an instance admin', async () => {
    queueBudgets({ workspaceMonthlyTokens: { 'ws-1': 1_000 } })
    queueUsage(1_500)
    queueTableRows(schemaMock.member, [{ role: 'member' }])

    expect((await checkBudget('ws-1', { userId: 'member-1' }, OPTIONS)).allowed).toBe(false)
  })

  it('lets executions through when the budget cannot be read, without caching that answer', async () => {
    instanceOrgMockFns.mockGetInstanceOrganizationId.mockRejectedValueOnce(new Error('db down'))
    expect(await checkBudget('ws-1', null, OPTIONS)).toEqual({
      allowed: true,
      reason: 'unavailable',
      usage: null,
      cap: null,
    })

    queueBudgets({ workspaceMonthlyTokens: { 'ws-1': 1_000 } })
    queueUsage(1_500)
    expect((await checkBudget('ws-1', null, OPTIONS)).allowed).toBe(false)
  })

  it('allows without reading usage when the instance has no budget', async () => {
    instanceOrgMockFns.mockGetInstanceOrganizationId.mockResolvedValue(null)
    expect(await checkBudget('ws-1', null, OPTIONS)).toEqual({
      allowed: true,
      usage: null,
      cap: null,
    })
  })
})

describe('updateBudgets', () => {
  it('changes one workspace cap and keeps the other caps and every other metadata key', async () => {
    queueBudgets(
      { instanceMonthlyTokens: 50_000, workspaceMonthlyTokens: { 'ws-1': 1_000, 'ws-2': 2_000 } },
      { nexoraOnboarding: { completed: ['team'], dismissed: false }, nexoraSettings: { x: 1 } }
    )

    await updateBudgets('org-instance', {
      workspaceMonthlyTokens: { 'ws-1': null, 'ws-3': 3_000 },
      alertThreshold: 0.9,
    })

    const metadata = writtenMetadata()
    expect(metadata?.nexoraOnboarding).toEqual({ completed: ['team'], dismissed: false })
    expect(metadata?.nexoraSettings).toEqual({ x: 1 })
    expect(parseBudgets(metadata)).toMatchObject({
      instanceMonthlyTokens: 50_000,
      workspaceMonthlyTokens: { 'ws-2': 2_000, 'ws-3': 3_000 },
      alertThreshold: 0.9,
    })
  })
})

describe('parseBudgets', () => {
  it('ignores garbage and defaults the alert threshold to 80 %', () => {
    expect(
      parseBudgets({
        nexoraBudgets: {
          instanceMonthlyTokens: -5,
          workspaceMonthlyTokens: { 'ws-1': 'lots', 'ws-2': 100 },
          alertThreshold: 7,
          alerts: 'none',
        },
      })
    ).toEqual({
      instanceMonthlyTokens: null,
      workspaceMonthlyTokens: { 'ws-2': 100 },
      alertThreshold: 0.8,
      alerts: [],
    })
  })
})
