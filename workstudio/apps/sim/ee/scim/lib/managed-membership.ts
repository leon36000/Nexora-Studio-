// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { type SQL, sql } from 'drizzle-orm'

/** Without SCIM no membership is directory-managed, so these guards never refuse. */
export async function assertInviteeNotScimManaged(_args: {
  organizationId?: string | null
  managed?: boolean | null
}): Promise<void> {}

export async function assertMembershipNotScimManaged(_args: {
  organizationId?: string | null
  userId?: string
  executor?: unknown
}): Promise<void> {}

export function scimManagedUserPredicate(_organizationId: string, _userId: unknown): SQL<boolean> {
  return sql<boolean>`false`
}
