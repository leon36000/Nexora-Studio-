// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import type { OrganizationWhitelabelSettings } from '@/lib/branding/types'

/**
 * Per-organization branding is not implemented yet (planned: read
 * `organization.whitelabel_settings` from @sim/db). Returning null keeps the instance brand.
 */
export async function getOrgWhitelabelSettings(
  _organizationId: string
): Promise<OrganizationWhitelabelSettings | null> {
  return null
}
