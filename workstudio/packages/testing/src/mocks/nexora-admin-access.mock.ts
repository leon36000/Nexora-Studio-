import { vi } from 'vitest'

/**
 * Controllable mock for `@/lib/nexora/admin-access` (Nexora edition: instance-admin guard). Set
 * `nexoraAdminAccessMockFns.mockAuthorizeInstanceAdmin.mockResolvedValue({ ok: true, userId,
 * organizationId })` or `{ ok: false, status: 403 }` per test.
 */
export const nexoraAdminAccessMockFns = {
  mockAuthorizeInstanceAdmin: vi.fn(),
}

/** Static mock module for `@/lib/nexora/admin-access`. */
export const nexoraAdminAccessMock = {
  authorizeInstanceAdmin: nexoraAdminAccessMockFns.mockAuthorizeInstanceAdmin,
}
