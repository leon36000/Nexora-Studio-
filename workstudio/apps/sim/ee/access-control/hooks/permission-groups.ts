// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.
'use client'

import { useQuery } from '@tanstack/react-query'
import { requestJson } from '@/lib/api/client/request'
import { getUserPermissionConfigContract } from '@/lib/api/contracts/permission-groups'
import {
  PERMISSION_GROUPS_STALE_TIME,
  permissionGroupKeys,
} from '@/hooks/queries/utils/permission-group-keys'

/**
 * Reads the caller's effective permission config from the core route /api/permission-groups/user.
 * Shares the core query key, so the server prefetch in prefetch-access.ts hydrates it.
 */
export function useUserPermissionConfig(workspaceId: string | undefined) {
  return useQuery({
    queryKey: permissionGroupKeys.userConfig(workspaceId),
    queryFn: ({ signal }) =>
      requestJson(getUserPermissionConfigContract, {
        query: { workspaceId: workspaceId ?? '' },
        signal,
      }),
    enabled: Boolean(workspaceId),
    staleTime: PERMISSION_GROUPS_STALE_TIME,
  })
}
