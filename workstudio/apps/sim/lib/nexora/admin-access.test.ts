import { authMockFns, createSession } from '@sim/testing'
import { instanceOrgMock, instanceOrgMockFns } from '@sim/testing/mocks/instance-org.mock'
import {
  organizationMembershipMock,
  organizationMembershipMockFns,
} from '@sim/testing/mocks/organization-membership.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/billing/organizations/membership', () => organizationMembershipMock)
vi.mock('@/lib/organizations/instance-org', () => instanceOrgMock)

import { authorizeInstanceAdmin } from '@/lib/nexora/admin-access'

const { mockGetUserOrganization } = organizationMembershipMockFns
const { mockGetInstanceOrganizationId } = instanceOrgMockFns

describe('authorizeInstanceAdmin', () => {
  beforeEach(() => {
    authMockFns.mockGetSession.mockResolvedValue(
      createSession({ userId: 'u-1', email: 'gerant@pme.fr', name: 'Gérant' })
    )
    mockGetUserOrganization.mockResolvedValue({
      organizationId: 'org-own',
      role: 'owner',
      memberId: 'm-1',
    })
  })

  it('without an instance organization, refuses instance-wide changes to the owner of any organization', async () => {
    mockGetInstanceOrganizationId.mockResolvedValue(null)
    expect(await authorizeInstanceAdmin({ requireInstanceOrganization: true })).toEqual({
      ok: false,
      status: 403,
    })
  })

  it('still lets that owner read what the instance shows any organization owner', async () => {
    mockGetInstanceOrganizationId.mockResolvedValue(null)
    expect(await authorizeInstanceAdmin()).toMatchObject({ ok: true, organizationId: 'org-own' })
  })

  it('accepts an admin of the instance organization for instance-wide changes', async () => {
    mockGetInstanceOrganizationId.mockResolvedValue('org-own')
    expect(await authorizeInstanceAdmin({ requireInstanceOrganization: true })).toMatchObject({
      ok: true,
    })
  })
})
