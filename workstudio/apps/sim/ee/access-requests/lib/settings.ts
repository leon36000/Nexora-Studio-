// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

/** Access requests are disabled in this edition. */
export async function isAccessRequestEnabled(_organizationId?: string | null): Promise<boolean> {
  return false
}
