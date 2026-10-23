import { authMockFns } from '@sim/testing'
import { instanceOrgMock, instanceOrgMockFns } from '@sim/testing/mocks/instance-org.mock'
import {
  nexoraAdminAccessMock,
  nexoraAdminAccessMockFns,
} from '@sim/testing/mocks/nexora-admin-access.mock'
import {
  organizationAuthorizationMock,
  organizationAuthorizationMockFns,
} from '@sim/testing/mocks/organization-authorization.mock'
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NexoraUsageUnavailableError } from '@/lib/nexora/usage'

const { mockFetchConsumptionByModel, mockReadWorkspaceConsumption } = vi.hoisted(() => ({
  mockFetchConsumptionByModel: vi.fn(),
  mockReadWorkspaceConsumption: vi.fn(),
}))

vi.mock('@/lib/nexora/admin-access', () => nexoraAdminAccessMock)
vi.mock('@/lib/organizations/instance-org', () => instanceOrgMock)
vi.mock('@/lib/core/application/organization-authorization', () => organizationAuthorizationMock)
vi.mock('@/lib/nexora/consumption/by-model', () => ({
  fetchConsumptionByModel: mockFetchConsumptionByModel,
}))
vi.mock('@/lib/nexora/consumption/by-workspace', () => ({
  readWorkspaceConsumption: mockReadWorkspaceConsumption,
}))

import { GET } from '@/app/api/nexora/consumption/route'

const NOW = new Date('2026-10-23T09:00:00Z')

/** WorkStudio's ledger: two workspaces (one since deleted), one person, two days of runs. */
const ledger = {
  totals: { executions: 12, promptTokens: 6_000, completionTokens: 2_000, totalTokens: 8_000 },
  workspaces: [
    {
      workspaceId: 'ws-ventes',
      name: 'Ventes',
      status: 'active',
      executions: 10,
      promptTokens: 4_500,
      completionTokens: 1_500,
      totalTokens: 6_000,
      tokensByModel: { 'mistral-small': 4_000, 'gpt-4o': 2_000 },
    },
    {
      workspaceId: null,
      name: null,
      status: 'deleted',
      executions: 2,
      promptTokens: 1_500,
      completionTokens: 500,
      totalTokens: 2_000,
      tokensByModel: { 'mistral-small': 2_000 },
    },
  ],
  users: [
    {
      userId: 'user-claire',
      name: 'Claire',
      email: 'claire@pme.fr',
      executions: 12,
      promptTokens: 6_000,
      completionTokens: 2_000,
      totalTokens: 8_000,
      tokensByModel: { 'mistral-small': 6_000, 'gpt-4o': 2_000 },
    },
  ],
  days: [
    { date: '2026-10-18', executions: 5, totalTokens: 3_000 },
    { date: '2026-10-23', executions: 7, totalTokens: 5_000 },
  ],
}

const measuredModels = [
  {
    model: 'mistral-small',
    aliases: ['nexora-default'],
    requests: 40,
    promptTokens: 7_000,
    completionTokens: 3_000,
    totalTokens: 10_000,
    kWh: 0.5,
    kgCO2eq: 0.0193,
  },
]

function request(query = '?days=7') {
  return new NextRequest(`http://localhost/api/nexora/consumption${query}`)
}

describe('GET /api/nexora/consumption', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    vi.stubEnv('NEXORA_TIME_ZONE', 'Europe/Paris')
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
    mockReadWorkspaceConsumption.mockResolvedValue(ledger)
    mockFetchConsumptionByModel.mockResolvedValue(measuredModels)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('refuses anyone but an instance admin, before reading any figure', async () => {
    nexoraAdminAccessMockFns.mockAuthorizeInstanceAdmin.mockResolvedValue({
      ok: false,
      status: 403,
    })
    const response = await GET(request(), {})
    expect(response.status).toBe(403)
    expect(mockReadWorkspaceConsumption).not.toHaveBeenCalled()
    expect(mockFetchConsumptionByModel).not.toHaveBeenCalled()
  })

  it('only offers the 7, 30 and 90 day periods', async () => {
    expect((await GET(request('?days=14'), {})).status).toBe(400)
    expect((await GET(request('?days=abc'), {})).status).toBe(400)
  })

  it('reports the measured figures, the car equivalent and an estimated footprint per row', async () => {
    const response = await GET(request(), {})
    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body.nexoraApiAvailable).toBe(true)
    expect(body.measured).toMatchObject({ requests: 40, totalTokens: 10_000, kWh: 0.5 })
    expect(body.measured.carKm).toBeCloseTo(0.1, 6)
    expect(body.carEmissionFactor.source).toContain('ADEME')

    const [ventes, deleted] = body.workspaces
    expect(ventes.footprint).toEqual({
      kgCO2eq: expect.closeTo(0.00772, 9),
      estimatedTokens: 4_000,
      unestimatedTokens: 2_000,
      estimate: true,
    })
    expect(ventes).not.toHaveProperty('tokensByModel')
    expect(deleted).toMatchObject({ workspaceId: null, status: 'deleted', totalTokens: 2_000 })
    expect(body.users[0].footprint).toMatchObject({ estimatedTokens: 6_000, estimate: true })
  })

  it('lists every local day of the period, with zero for the days nothing ran', async () => {
    const body = await (await GET(request(), {})).json()
    expect(body.days).toHaveLength(7)
    expect(body.days[0]).toEqual({ date: '2026-10-17', executions: 0, totalTokens: 0 })
    expect(body.days[1]).toEqual({ date: '2026-10-18', executions: 5, totalTokens: 3_000 })
    expect(body.days[6]).toEqual({ date: '2026-10-23', executions: 7, totalTokens: 5_000 })
    expect(body.period).toMatchObject({ days: 7, timeZone: 'Europe/Paris' })
    expect(body.period.start).toBe('2026-10-16T22:00:00.000Z')
  })

  it('keeps the WorkStudio figures when Nexora API is down, and marks the footprint unavailable', async () => {
    mockFetchConsumptionByModel.mockRejectedValue(
      new NexoraUsageUnavailableError('Nexora API consumption could not be read: HTTP 502')
    )
    const response = await GET(request(), {})
    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body.nexoraApiAvailable).toBe(false)
    expect(body.measured).toBeNull()
    expect(body.models).toBeNull()
    expect(body.workstudio).toEqual(ledger.totals)
    expect(body.workspaces.map((row: { totalTokens: number }) => row.totalTokens)).toEqual([
      6_000, 2_000,
    ])
    expect(body.workspaces.every((row: { footprint: unknown }) => row.footprint === null)).toBe(
      true
    )
    expect(body.users[0].footprint).toBeNull()
  })

  it('fails the request when WorkStudio’s own figures cannot be read', async () => {
    mockReadWorkspaceConsumption.mockRejectedValue(new Error('replica unreachable'))
    expect((await GET(request(), {})).status).toBe(500)
  })
})
