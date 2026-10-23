import { authMockFns } from '@sim/testing'
import { auditMock, auditMockFns } from '@sim/testing/mocks/audit.mock'
import { instanceOrgMock, instanceOrgMockFns } from '@sim/testing/mocks/instance-org.mock'
import {
  nexoraAdminAccessMock,
  nexoraAdminAccessMockFns,
} from '@sim/testing/mocks/nexora-admin-access.mock'
import { nexoraBudgetsMock, nexoraBudgetsMockFns } from '@sim/testing/mocks/nexora-budgets.mock'
import {
  organizationAuthorizationMock,
  organizationAuthorizationMockFns,
} from '@sim/testing/mocks/organization-authorization.mock'
import { createMockRequest } from '@sim/testing/mocks/request.mock'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockReadWorkspaceConsumption, mockListBudgetWorkspaces, mockExistingWorkspaceIds } =
  vi.hoisted(() => ({
    mockReadWorkspaceConsumption: vi.fn(),
    mockListBudgetWorkspaces: vi.fn(),
    mockExistingWorkspaceIds: vi.fn(),
  }))

vi.mock('@sim/audit', () => auditMock)
vi.mock('@/lib/nexora/admin-access', () => nexoraAdminAccessMock)
vi.mock('@/lib/organizations/instance-org', () => instanceOrgMock)
vi.mock('@/lib/core/application/organization-authorization', () => organizationAuthorizationMock)
vi.mock('@/lib/nexora/consumption/budgets', () => nexoraBudgetsMock)
vi.mock('@/lib/nexora/consumption/by-workspace', () => ({
  readWorkspaceConsumption: mockReadWorkspaceConsumption,
}))
vi.mock('@/lib/nexora/consumption/workspaces', () => ({
  listBudgetWorkspaces: mockListBudgetWorkspaces,
  existingWorkspaceIds: mockExistingWorkspaceIds,
}))

import { GET, PUT } from '@/app/api/nexora/budgets/route'

interface StoredBudgets {
  instanceMonthlyTokens: number | null
  workspaceMonthlyTokens: Record<string, number>
  alertThreshold: number
  alerts: unknown[]
}

/** Stands in for `organization.metadata.nexoraBudgets` of the instance organization. */
let stored: StoredBudgets

const lastMonthAlert = {
  scope: 'instance',
  workspaceId: null,
  level: 'threshold',
  month: '2026-09',
  at: '2026-09-28T10:00:00.000Z',
  usage: 900,
  cap: 1_000,
}
const thisMonthAlert = { ...lastMonthAlert, month: '2026-10', at: '2026-10-20T10:00:00.000Z' }

function getRequest() {
  return createMockRequest({ method: 'GET', url: '/api/nexora/budgets' })
}

function putRequest(body: unknown) {
  return createMockRequest({ method: 'PUT', url: '/api/nexora/budgets', body })
}

describe('/api/nexora/budgets', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-23T09:00:00Z'))
    vi.stubEnv('NEXORA_TIME_ZONE', 'Europe/Paris')
    stored = {
      instanceMonthlyTokens: null,
      workspaceMonthlyTokens: {},
      alertThreshold: 0.8,
      alerts: [lastMonthAlert, thisMonthAlert],
    }
    authMockFns.mockGetSession.mockResolvedValue({
      user: { id: 'admin-1' },
      session: { id: 'session-1' },
    })
    nexoraAdminAccessMockFns.mockAuthorizeInstanceAdmin.mockResolvedValue({
      ok: true,
      userId: 'admin-1',
      organizationId: 'org-instance',
    })
    instanceOrgMockFns.mockGetInstanceOrganizationId.mockResolvedValue('org-instance')
    organizationAuthorizationMockFns.mockAuthorizeOrganizationOperation.mockResolvedValue({
      organizationId: 'org-instance',
      userId: 'admin-1',
      role: 'admin',
    })
    nexoraBudgetsMockFns.mockReadBudgets.mockImplementation(async () => ({
      ...structuredClone(stored),
      organizationId: 'org-instance',
    }))
    nexoraBudgetsMockFns.mockUpdateBudgets.mockImplementation(
      async (
        _organizationId: string,
        change: {
          instanceMonthlyTokens?: number | null
          workspaceMonthlyTokens?: Record<string, number | null>
          alertThreshold?: number
        }
      ) => {
        if (change.instanceMonthlyTokens !== undefined) {
          stored.instanceMonthlyTokens = change.instanceMonthlyTokens
        }
        for (const [id, cap] of Object.entries(change.workspaceMonthlyTokens ?? {})) {
          if (cap === null) delete stored.workspaceMonthlyTokens[id]
          else stored.workspaceMonthlyTokens[id] = cap
        }
        if (change.alertThreshold !== undefined) stored.alertThreshold = change.alertThreshold
        return structuredClone(stored)
      }
    )
    mockReadWorkspaceConsumption.mockResolvedValue({
      totals: { executions: 3, promptTokens: 700, completionTokens: 300, totalTokens: 1_000 },
      workspaces: [
        { workspaceId: 'ws-ventes', totalTokens: 800 },
        { workspaceId: null, totalTokens: 200 },
      ],
      users: [],
      days: [],
    })
    mockListBudgetWorkspaces.mockResolvedValue([
      { id: 'ws-compta', name: 'Comptabilité', status: 'active' },
      { id: 'ws-ventes', name: 'Ventes', status: 'active' },
    ])
    mockExistingWorkspaceIds.mockImplementation(
      async (ids: string[]) => new Set(ids.filter((id) => id === 'ws-ventes' || id === 'ws-compta'))
    )
  })

  afterEach(() => {
    nexoraBudgetsMockFns.mockReadBudgets.mockReset()
    nexoraBudgetsMockFns.mockUpdateBudgets.mockReset()
    vi.useRealTimers()
  })

  it('refuses reading and changing budgets to anyone but an instance admin', async () => {
    nexoraAdminAccessMockFns.mockAuthorizeInstanceAdmin.mockResolvedValue({
      ok: false,
      status: 403,
    })
    expect((await GET(getRequest(), {})).status).toBe(403)
    expect((await PUT(putRequest({ instanceMonthlyTokens: 1_000 }), {})).status).toBe(403)
    expect(nexoraBudgetsMockFns.mockReadBudgets).not.toHaveBeenCalled()
    expect(nexoraBudgetsMockFns.mockUpdateBudgets).not.toHaveBeenCalled()
    expect(auditMockFns.mockRecordAudit).not.toHaveBeenCalled()
  })

  it('shows this month’s usage against the caps, the workspaces to pick from and this month’s alerts only', async () => {
    stored.instanceMonthlyTokens = 1_250
    const response = await GET(getRequest(), {})
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.month).toBe('2026-10')
    expect(body.budgets).toEqual({
      instanceMonthlyTokens: 1_250,
      workspaceMonthlyTokens: {},
      alertThreshold: 0.8,
    })
    expect(body.usage).toEqual({ instance: 1_000, workspaces: { 'ws-ventes': 800 } })
    expect(body.workspaces.map((ws: { id: string }) => ws.id)).toEqual(['ws-compta', 'ws-ventes'])
    expect(body.alerts).toEqual([thisMonthAlert])
  })

  it.each([
    ['a negative cap', { instanceMonthlyTokens: -5 }],
    ['a fractional cap', { workspaceMonthlyTokens: { 'ws-ventes': 10.5 } }],
    ['a zero cap', { instanceMonthlyTokens: 0 }],
    ['a threshold above 100 %', { alertThreshold: 1.5 }],
    ['a threshold of zero', { alertThreshold: 0 }],
    ['an empty change', {}],
  ])('rejects %s without saving anything', async (_label, body) => {
    const response = await PUT(putRequest(body), {})
    expect(response.status).toBe(400)
    expect(nexoraBudgetsMockFns.mockUpdateBudgets).not.toHaveBeenCalled()
    expect(auditMockFns.mockRecordAudit).not.toHaveBeenCalled()
  })

  it('rejects a cap on a workspace that does not exist', async () => {
    const response = await PUT(
      putRequest({ workspaceMonthlyTokens: { 'ws-ventes': 5_000, 'ws-inconnu': 1_000 } }),
      {}
    )
    expect(response.status).toBe(400)
    expect(nexoraBudgetsMockFns.mockUpdateBudgets).not.toHaveBeenCalled()
  })

  it('lets a deleted workspace’s cap be removed', async () => {
    stored.workspaceMonthlyTokens = { 'ws-supprime': 3_000 }
    const response = await PUT(putRequest({ workspaceMonthlyTokens: { 'ws-supprime': null } }), {})
    expect(response.status).toBe(200)
    expect((await response.json()).budgets.workspaceMonthlyTokens).toEqual({})
  })

  it('saves the caps and threshold, reads them back, and records who changed what', async () => {
    const saved = await PUT(
      putRequest({
        instanceMonthlyTokens: 2_000_000,
        workspaceMonthlyTokens: { 'ws-ventes': 50_000 },
        alertThreshold: 0.9,
      }),
      {}
    )
    expect(saved.status).toBe(200)
    const expected = {
      instanceMonthlyTokens: 2_000_000,
      workspaceMonthlyTokens: { 'ws-ventes': 50_000 },
      alertThreshold: 0.9,
    }
    expect((await saved.json()).budgets).toEqual(expected)
    expect((await (await GET(getRequest(), {})).json()).budgets).toEqual(expected)

    expect(auditMockFns.mockRecordAudit).toHaveBeenCalledTimes(1)
    expect(auditMockFns.mockRecordAudit.mock.calls[0][0]).toMatchObject({
      actorId: 'admin-1',
      action: 'organization.budgets.updated',
      resourceType: 'organization',
      resourceId: 'org-instance',
      metadata: { change: expected, organizationId: 'org-instance' },
    })
  })

  it('removes the instance cap with null', async () => {
    stored.instanceMonthlyTokens = 1_000
    const response = await PUT(putRequest({ instanceMonthlyTokens: null }), {})
    expect((await response.json()).budgets.instanceMonthlyTokens).toBeNull()
  })
})
