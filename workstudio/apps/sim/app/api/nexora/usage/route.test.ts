import { authMockFns, createSession } from '@sim/testing'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetUserOrganization, mockFetchNexoraApiUsage } = vi.hoisted(() => ({
  mockGetUserOrganization: vi.fn(),
  mockFetchNexoraApiUsage: vi.fn(),
}))

vi.mock('@/lib/billing/organizations/membership', () => ({
  getUserOrganization: mockGetUserOrganization,
}))

vi.mock('@/lib/nexora/usage', () => ({
  fetchNexoraApiUsage: mockFetchNexoraApiUsage,
  NexoraUsageUnavailableError: class NexoraUsageUnavailableError extends Error {},
}))

import { GET } from '@/app/api/nexora/usage/route'

const usage = {
  days: [],
  totals: { requests: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, kgCO2eq: 0 },
}

function request() {
  return new NextRequest('http://localhost/api/nexora/usage?days=7')
}

describe('GET /api/nexora/usage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMockFns.mockGetSession.mockResolvedValue(
      createSession({ userId: 'user-1', email: 'gerant@pme.fr', name: 'Gérant' })
    )
    mockFetchNexoraApiUsage.mockResolvedValue(usage)
  })

  it('requires a session', async () => {
    authMockFns.mockGetSession.mockResolvedValue(null)
    expect((await GET(request(), {})).status).toBe(401)
  })

  it('shows instance consumption to organization owners and admins', async () => {
    mockGetUserOrganization.mockResolvedValue({
      organizationId: 'org-1',
      role: 'admin',
      memberId: 'm-1',
    })
    const response = await GET(request(), {})
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual(usage)
    expect(mockFetchNexoraApiUsage).toHaveBeenCalledWith({ days: 7 })
  })

  it('hides it from plain members and from users outside any organization', async () => {
    mockGetUserOrganization.mockResolvedValue({
      organizationId: 'org-1',
      role: 'member',
      memberId: 'm-1',
    })
    expect((await GET(request(), {})).status).toBe(403)
    mockGetUserOrganization.mockResolvedValue(null)
    expect((await GET(request(), {})).status).toBe(403)
    expect(mockFetchNexoraApiUsage).not.toHaveBeenCalled()
  })
})
