'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { requestJson } from '@/lib/api/client/request'
import {
  type DiscoverAccessRequestsQuery,
  discoverAccessRequestsContract,
} from '@/lib/api/contracts/access-requests'
import type {
  WorkspaceCreditAvailability,
  WorkspaceUsageGate,
} from '@/lib/api/contracts/workspaces'
import {
  ACCESS_REQUESTS_STALE_TIME,
  accessRequestKeys,
} from '@/hooks/queries/utils/access-request-keys'
import { permissionGroupKeys } from '@/hooks/queries/utils/permission-group-keys'
import { workspaceUsageKeys } from '@/hooks/queries/utils/workspace-usage-keys'

export const ACCESS_REQUESTS_POLL_INTERVAL = 30_000

export function useDiscoverAccessRequests(query: DiscoverAccessRequestsQuery, enabled = true) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: accessRequestKeys.discovery(query),
    queryFn: async ({ signal }) => {
      const result = await requestJson(discoverAccessRequestsContract, { query, signal })
      if (result.enabled && query.kind === 'workspace') {
        void queryClient.refetchQueries(
          {
            queryKey: permissionGroupKeys.userConfig(query.workspaceId),
            exact: true,
            type: 'active',
            stale: true,
          },
          { cancelRefetch: false }
        )
        const usageKey = workspaceUsageKeys.gate(query.workspaceId)
        const usage = queryClient.getQueryData<WorkspaceUsageGate>(usageKey)
        if (usage?.scope === 'member' && usage.isExceeded) {
          void queryClient.refetchQueries(
            { queryKey: usageKey, exact: true, type: 'active', stale: true },
            { cancelRefetch: false }
          )
        }
        const creditKey = workspaceUsageKeys.creditAvailability(query.workspaceId)
        const credit = queryClient.getQueryData<WorkspaceCreditAvailability>(creditKey)
        if (credit?.scope === 'member') {
          void queryClient.refetchQueries(
            { queryKey: creditKey, exact: true, type: 'active', stale: true },
            { cancelRefetch: false }
          )
        }
      }
      return result
    },
    enabled:
      Boolean(query.kind === 'workspace' ? query.workspaceId : query.organizationId) && enabled,
    staleTime: ACCESS_REQUESTS_STALE_TIME,
    refetchInterval: (query) =>
      query.state.data?.enabled === false ? false : ACCESS_REQUESTS_POLL_INTERVAL,
  })
}
