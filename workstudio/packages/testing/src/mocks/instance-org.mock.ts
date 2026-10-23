import { vi } from 'vitest'

/**
 * Controllable mock functions for `@/lib/organizations/instance-org` (Nexora edition: the
 * organization every account of the instance joins). Bare `vi.fn()`s; set per test, e.g.
 * `instanceOrgMockFns.mockGetInstanceOrganizationId.mockResolvedValue('org-instance')`.
 */
export const instanceOrgMockFns = {
  mockGetInstanceOrganizationConfig: vi.fn(),
  mockGetInstanceOrganizationId: vi.fn(),
  mockEnsureInstanceOrganization: vi.fn(),
  mockJoinInstanceOrganization: vi.fn(),
}

/** Static mock module for `@/lib/organizations/instance-org`. */
export const instanceOrgMock = {
  getInstanceOrganizationConfig: instanceOrgMockFns.mockGetInstanceOrganizationConfig,
  getInstanceOrganizationId: instanceOrgMockFns.mockGetInstanceOrganizationId,
  ensureInstanceOrganization: instanceOrgMockFns.mockEnsureInstanceOrganization,
  joinInstanceOrganization: instanceOrgMockFns.mockJoinInstanceOrganization,
}
