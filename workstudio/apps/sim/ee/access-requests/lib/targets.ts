// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

export const ACCESS_REQUEST_TARGET_KINDS = [
  'feature',
  'integration',
  'model',
  'tool',
  'capability',
  'usage_limit',
] as const

export type AccessRequestScope =
  | { kind: 'workspace'; workspaceId: string }
  | { kind: 'organization'; organizationId: string }
