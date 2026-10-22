// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

export const FORK_AVAILABILITY_STALE_TIME = 5 * 60 * 1000

export const forkAvailabilityKeys = {
  all: ['workspace-fork-availability'] as const,
  detail: (workspaceId: string) => ['workspace-fork-availability', workspaceId] as const,
}

/** Forking is disabled in this edition. */
export function useForkingAvailable(_workspaceId?: string): boolean {
  return false
}
