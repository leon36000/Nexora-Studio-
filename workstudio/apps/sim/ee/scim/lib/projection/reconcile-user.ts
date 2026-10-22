// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

export const PROJECTION_BATCH_SIZE = 100

export async function reconcileUsersProjectionInBatches(_args: {
  connectionId?: string
  organizationId?: string
  scimUserIds?: readonly string[]
  settings?: unknown
}): Promise<{ reconciled: number }> {
  return { reconciled: 0 }
}
