// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { FeatureDisabledError } from '@/ee/_nexora/disabled'

export async function isForkingAvailableForWorkspace(
  _organizationId?: string | null
): Promise<boolean> {
  return false
}

/** Forking is disabled, so the fork admin surfaces (e.g. the Activity feed) are not found. */
export async function assertWorkspaceAdminAccess(
  _workspaceId: string,
  _userId: string
): Promise<never> {
  throw new FeatureDisabledError('Workspace forking')
}
