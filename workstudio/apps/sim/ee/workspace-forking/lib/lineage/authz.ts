// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { FeatureDisabledError } from '@/ee/_nexora/disabled'

export class ForkError extends Error {
  constructor(message = 'Workspace forking is not available') {
    super(message)
    this.name = 'ForkError'
  }
}

export async function isForkingAvailableForWorkspace(_organizationId?: string | null): Promise<boolean> {
  return false
}

export async function assertForkingEnabled(..._args: unknown[]): Promise<never> {
  throw new FeatureDisabledError('Workspace forking')
}

/** Forking is disabled, so the fork admin surfaces (e.g. the Activity feed) are not found. */
export async function assertWorkspaceAdminAccess(_workspaceId: string, _userId: string): Promise<never> {
  throw new FeatureDisabledError('Workspace forking')
}

export const assertCanFork = assertForkingEnabled
export const assertCanPromote = assertForkingEnabled
export const assertCanRollback = assertForkingEnabled
export const assertCanUnlink = assertForkingEnabled
