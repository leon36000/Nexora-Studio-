import { member, organization } from '@sim/db/schema'
import {
  authMockFns,
  createMockRequest,
  createSession,
  queueTableRows,
  resetDbChainMock,
} from '@sim/testing'
import { createRouteContext } from '@sim/testing/helpers/http'
import { billingOrganizationMock } from '@sim/testing/mocks/billing-organization.mock'
import {
  permissionGroupsResolveMock,
  permissionGroupsResolveMockFns,
} from '@sim/testing/mocks/permission-groups-resolve.mock'
import { workspaceAuthzMock } from '@sim/testing/mocks/workspace-authz.mock'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@sim/platform-authz/workspace', () => workspaceAuthzMock)
vi.mock('@/lib/permission-groups/resolve.server', () => permissionGroupsResolveMock)
vi.mock('@/lib/billing/core/organization', () => billingOrganizationMock)

import { GET } from '@/app/api/organizations/[id]/route'

const REQUEST_URL = 'http://localhost/api/organizations/org-1'

/** The instance organization as stored: Nexora keeps its settings and budgets in the metadata. */
const STORED_ORGANIZATION = {
  id: 'org-1',
  name: 'PME',
  slug: 'pme',
  logo: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-10-01T00:00:00Z'),
  metadata: {
    instanceOrganization: true,
    nexoraSettings: {
      sso: { issuer: 'https://idp.pme.fr', clientId: 'workstudio', clientSecret: 'enc:secret' },
      smtp: { host: 'smtp.pme.fr', port: 587, user: 'robot', password: 'enc:password' },
      allowedDomains: ['pme.fr'],
    },
    nexoraBudgets: { instanceMonthlyTokens: 1_000_000, workspaceMonthlyTokens: {} },
    nexoraOnboarding: { completed: true },
  },
}

afterAll(resetDbChainMock)

describe('GET /api/organizations/[id]', () => {
  beforeEach(() => {
    resetDbChainMock()
    authMockFns.mockGetSession.mockResolvedValue({
      ...createSession({ userId: 'user-member' }),
      session: { id: 'session-member' },
    })
    permissionGroupsResolveMockFns.mockGetUserPermissionConfigForOrganization.mockResolvedValue(
      null
    )
  })

  it('never shows a member the instance settings or budgets kept in the metadata', async () => {
    queueTableRows(member, [{ id: 'member-1', role: 'member' }])
    queueTableRows(organization, [STORED_ORGANIZATION])

    const response = await GET(
      createMockRequest('GET', undefined, {}, REQUEST_URL),
      createRouteContext({ id: 'org-1' })
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data.metadata).toEqual({ instanceOrganization: true })
    expect(JSON.stringify(body)).not.toMatch(/nexora|smtp|idp\.pme\.fr|enc:/i)
  })
})
