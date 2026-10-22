'use client'

import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import { requestJson } from '@/lib/api/client/request'
import { type AuditLogPage, listAuditLogsContract } from '@/lib/api/contracts/audit-logs'

const PAGE_SIZE = 50

export const AUDIT_LOGS_STALE_TIME = 30 * 1000

export interface AuditLogFilters {
  organizationId: string
  search?: string
  startDate?: string
}

export const auditLogKeys = {
  all: ['audit-logs'] as const,
  lists: () => [...auditLogKeys.all, 'list'] as const,
  list: (filters: AuditLogFilters) => [...auditLogKeys.lists(), filters] as const,
}

async function fetchAuditLogPage(
  filters: AuditLogFilters,
  cursor: string | undefined,
  signal?: AbortSignal
): Promise<AuditLogPage> {
  return requestJson(listAuditLogsContract, {
    query: {
      organizationId: filters.organizationId,
      search: filters.search || undefined,
      startDate: filters.startDate,
      limit: String(PAGE_SIZE),
      cursor,
    },
    signal,
  })
}

/** Organization audit trail, newest first, one page per `fetchNextPage`. */
export function useAuditLogs(filters: AuditLogFilters) {
  return useInfiniteQuery({
    queryKey: auditLogKeys.list(filters),
    queryFn: ({ pageParam, signal }) => fetchAuditLogPage(filters, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: AUDIT_LOGS_STALE_TIME,
    placeholderData: keepPreviousData,
  })
}
