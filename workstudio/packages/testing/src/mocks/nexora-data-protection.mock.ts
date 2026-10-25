import { vi } from 'vitest'

interface PolicyLike {
  defaultMode: 'allow' | 'mask' | 'refuse'
  workspaceModes: Record<string, 'allow' | 'mask' | 'refuse'>
}

/**
 * Controllable mock for `@/lib/nexora/data-protection/policy` (Nexora edition: what happens to
 * personal data sent to a model outside this server). `loadDataProtection` lets everything through
 * by default; set a policy with `nexoraDataProtectionMockFns.mockLoadDataProtection
 * .mockResolvedValue({ defaultMode: 'mask', workspaceModes: {} })`.
 */
export const nexoraDataProtectionMockFns = {
  mockLoadDataProtection: vi.fn<() => Promise<PolicyLike>>(async () => ({
    defaultMode: 'allow',
    workspaceModes: {},
  })),
  mockReadDataProtection: vi.fn(),
  mockUpdateDataProtection: vi.fn(),
  mockResetDataProtectionCache: vi.fn(),
}

/** Static mock module for `@/lib/nexora/data-protection/policy`. */
export const nexoraDataProtectionMock = {
  PERSONAL_DATA_MODES: ['allow', 'mask', 'refuse'] as const,
  loadDataProtection: nexoraDataProtectionMockFns.mockLoadDataProtection,
  readDataProtection: nexoraDataProtectionMockFns.mockReadDataProtection,
  updateDataProtection: nexoraDataProtectionMockFns.mockUpdateDataProtection,
  resetDataProtectionCache: nexoraDataProtectionMockFns.mockResetDataProtectionCache,
  parseDataProtection: vi.fn(() => ({ defaultMode: 'allow', workspaceModes: {} })),
  applyDataProtectionChange: vi.fn(),
  resolveMode: vi.fn((policy: PolicyLike, workspaceId: string | null) =>
    workspaceId !== null && Object.hasOwn(policy.workspaceModes, workspaceId)
      ? policy.workspaceModes[workspaceId]
      : policy.defaultMode
  ),
}
