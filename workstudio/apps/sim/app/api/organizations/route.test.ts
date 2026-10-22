import { member, subscription } from '@sim/db/schema'
import {
  auditMock,
  resetEnvFlagsMock,
  setEnvFlags,
  authMockFns,
  createSession,
  queueTableRows,
  resetDbChainMock,
} from '@sim/testing'
import {
  billingPlanHelpersMock,
  billingPlanHelpersMockFns,
} from '@sim/testing/mocks/billing-plan-helpers.mock'
import { billingSubscriptionUtilsMock } from '@sim/testing/mocks/billing-subscription-utils.mock'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockSetActiveOrganizationForCurrentSession,
  mockCreateOrganizationForTeamPlan,
  mockEnsureOrganizationForTeamSubscription,
  mockAttachOwnedWorkspacesToOrganization,
  WorkspaceOrganizationMembershipConflictError,
} = vi.hoisted(() => ({
  mockSetActiveOrganizationForCurrentSession: vi.fn().mockResolvedValue(undefined),
  mockCreateOrganizationForTeamPlan: vi.fn(),
  mockEnsureOrganizationForTeamSubscription: vi.fn(),
  mockAttachOwnedWorkspacesToOrganization: vi.fn().mockResolvedValue(undefined),
  WorkspaceOrganizationMembershipConflictError: class WorkspaceOrganizationMembershipConflictError extends Error {},
}))

vi.mock('@sim/audit', () => auditMock)

vi.mock('@/lib/auth/active-organization', () => ({
  setActiveOrganizationForCurrentSession: mockSetActiveOrganizationForCurrentSession,
}))

vi.mock('@/lib/billing/organization', () => ({
  createOrganizationForTeamPlan: mockCreateOrganizationForTeamPlan,
  ensureOrganizationForTeamSubscription: mockEnsureOrganizationForTeamSubscription,
}))

vi.mock('@/lib/billing/organizations/create-organization', () => ({
  OrganizationSlugInvalidError: class OrganizationSlugInvalidError extends Error {},
  OrganizationSlugTakenError: class OrganizationSlugTakenError extends Error {},
}))

/** Mirrors the real predicate, which also admits the `team_*` credit tiers. */
vi.mock('@/lib/billing/plan-helpers', () => billingPlanHelpersMock)

vi.mock('@/lib/billing/subscriptions/utils', () => billingSubscriptionUtilsMock)

vi.mock('@/lib/workspaces/organization-workspaces', () => ({
  attachOwnedWorkspacesToOrganization: mockAttachOwnedWorkspacesToOrganization,
  WorkspaceOrganizationMembershipConflictError,
}))

import { POST } from '@/app/api/organizations/route'

billingPlanHelpersMockFns.mockIsOrgPlan.mockImplementation(
  (plan) => plan === 'team' || plan?.startsWith('team_') === true || plan === 'enterprise'
)

const mockGetSession = authMockFns.mockGetSession

afterAll(resetDbChainMock)

describe('POST /api/organizations', () => {
  beforeEach(() => {
    resetDbChainMock()
    resetEnvFlagsMock()
    setEnvFlags({ isBillingEnabled: true })
  })

  it('recovers an owner org when the subscription was already moved onto the organization', async () => {
    mockGetSession.mockResolvedValue(
      createSession({
        userId: 'user-1',
        email: 'owner@example.com',
        name: 'Owner',
      })
    )
    queueTableRows(member, [{ organizationId: 'legacy-org-id', role: 'owner' }])
    queueTableRows(subscription, [
      { id: 'sub-1', plan: 'team', referenceId: 'legacy-org-id', status: 'active', seats: 5 },
    ])

    const response = await POST(
      new Request('http://localhost/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Recovered Org' }),
      })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      success: true,
      organizationId: 'legacy-org-id',
      created: false,
    })
    expect(mockAttachOwnedWorkspacesToOrganization).toHaveBeenCalledWith({
      ownerUserId: 'user-1',
      organizationId: 'legacy-org-id',
      includeArchived: true,
    })
    expect(mockCreateOrganizationForTeamPlan).not.toHaveBeenCalled()
    expect(mockEnsureOrganizationForTeamSubscription).not.toHaveBeenCalled()
    expect(mockSetActiveOrganizationForCurrentSession).toHaveBeenCalledWith('legacy-org-id')
    expect(auditMock.recordAudit).not.toHaveBeenCalled()
  })

  it('still blocks users who are only members of another organization', async () => {
    mockGetSession.mockResolvedValue(
      createSession({
        userId: 'user-1',
        email: 'member@example.com',
        name: 'Member',
      })
    )
    queueTableRows(member, [{ organizationId: 'org-1', role: 'member' }])

    const response = await POST(
      new Request('http://localhost/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Blocked Org' }),
      })
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      error:
        'You are already a member of an organization. Leave your current organization before creating a new one.',
    })
    expect(mockEnsureOrganizationForTeamSubscription).not.toHaveBeenCalled()
    expect(mockCreateOrganizationForTeamPlan).not.toHaveBeenCalled()
    expect(mockAttachOwnedWorkspacesToOrganization).not.toHaveBeenCalled()
  })

  it('returns a conflict when existing shared workspace members block organization attachment', async () => {
    mockGetSession.mockResolvedValue(
      createSession({
        userId: 'user-1',
        email: 'owner@example.com',
        name: 'Owner',
      })
    )
    queueTableRows(member, [{ organizationId: 'legacy-org-id', role: 'owner' }])
    queueTableRows(subscription, [
      { id: 'sub-1', plan: 'team', referenceId: 'legacy-org-id', status: 'active', seats: 5 },
    ])
    mockAttachOwnedWorkspacesToOrganization.mockRejectedValueOnce(
      new WorkspaceOrganizationMembershipConflictError([
        { userId: 'user-2', organizationId: 'org-2' },
      ])
    )

    const response = await POST(
      new Request('http://localhost/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Recovered Org' }),
      })
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      error:
        'One or more members of your existing shared workspaces already belong to another organization. Remove them from those workspaces before converting them to organization-owned workspaces.',
    })
    expect(mockSetActiveOrganizationForCurrentSession).not.toHaveBeenCalled()
  })
})

describe('POST /api/organizations (Nexora edition, billing disabled)', () => {
  beforeEach(() => {
    resetDbChainMock()
    resetEnvFlagsMock()
    setEnvFlags({ isBillingEnabled: false })
    mockCreateOrganizationForTeamPlan.mockReset()
  })

  it('lets a user without an organization found one, with no subscription', async () => {
    mockGetSession.mockResolvedValue(
      createSession({ userId: 'user-9', email: 'gerant@pme.fr', name: 'Gérant' })
    )
    queueTableRows(member, [])
    mockCreateOrganizationForTeamPlan.mockResolvedValue('org-new')

    const response = await POST(
      new Request('http://localhost/api/organizations', {
        method: 'POST',
        body: JSON.stringify({ name: 'PME Exemple', slug: 'pme-exemple' }),
      })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      organizationId: 'org-new',
      created: true,
    })
    expect(mockCreateOrganizationForTeamPlan).toHaveBeenCalledWith(
      'user-9',
      'PME Exemple',
      'gerant@pme.fr',
      'pme-exemple'
    )
    expect(mockEnsureOrganizationForTeamSubscription).not.toHaveBeenCalled()
  })

  it('refuses a second organization to a user who already administers one', async () => {
    mockGetSession.mockResolvedValue(
      createSession({ userId: 'user-9', email: 'gerant@pme.fr', name: 'Gérant' })
    )
    queueTableRows(member, [{ organizationId: 'org-existing', role: 'owner' }])

    const response = await POST(
      new Request('http://localhost/api/organizations', {
        method: 'POST',
        body: JSON.stringify({ name: 'Autre' }),
      })
    )

    expect(response.status).toBe(409)
    expect(mockCreateOrganizationForTeamPlan).not.toHaveBeenCalled()
  })
})

