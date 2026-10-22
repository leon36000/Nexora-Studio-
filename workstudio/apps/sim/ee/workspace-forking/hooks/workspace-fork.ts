// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.
'use client'

import { queryOptions } from '@tanstack/react-query'

export const forkKeys = {
  all: ['workspace-fork'] as const,
  lineage: (workspaceId: string) => ['workspace-fork', 'lineage', workspaceId] as const,
  mapping: (workspaceId: string, parentId: string, direction: string) =>
    ['workspace-fork', 'mapping', workspaceId, parentId, direction] as const,
  diff: (workspaceId: string, parentId: string, direction: string) =>
    ['workspace-fork', 'diff', workspaceId, parentId, direction] as const,
}

/** Resolves to `null` without a network call: there is never a fork lineage. */
export function forkLineageQueryOptions(workspaceId: string) {
  return queryOptions({
    queryKey: forkKeys.lineage(workspaceId),
    queryFn: async () => null,
    staleTime: Number.POSITIVE_INFINITY,
  })
}
