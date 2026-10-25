'use client'

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { isApiClientError } from '@/lib/api/client/errors'
import { requestJson } from '@/lib/api/client/request'
import {
  getInstanceTraceContract,
  getTraceSettingsContract,
  getWorkspaceTraceContract,
  listInstanceTracesContract,
  listWorkspaceTraceFacetsContract,
  listWorkspaceTracesContract,
  type NexoraTraceFiltersQuery,
  type NexoraTraceSettingsChange,
  purgeTracesContract,
  testTraceExportContract,
  updateTraceSettingsContract,
} from '@/lib/api/contracts/nexora-traces'

/** Traces arrive as people use the product: the list refreshes itself while the page is open. */
const TRACES_REFRESH_MS = 10_000
const TRACE_DETAIL_STALE_TIME = 5 * 60 * 1000
const TRACE_FACETS_STALE_TIME = 60 * 1000
const TRACE_SETTINGS_STALE_TIME = 30 * 1000

/** `'instance'` reads the traces of no workspace (instance keys), for instance administrators. */
export type TraceScopeKey = string | 'instance'

export type TraceListFilters = Omit<NexoraTraceFiltersQuery, 'cursor' | 'limit'>

const nexoraTraceKeys = {
  all: ['nexora-traces'] as const,
  lists: () => [...nexoraTraceKeys.all, 'list'] as const,
  list: (scope: TraceScopeKey, filters: TraceListFilters) =>
    [...nexoraTraceKeys.lists(), scope, filters] as const,
  detail: (scope: TraceScopeKey, traceId: string) =>
    [...nexoraTraceKeys.all, 'detail', scope, traceId] as const,
  facets: (workspaceId: string) => [...nexoraTraceKeys.all, 'facets', workspaceId] as const,
  settings: () => [...nexoraTraceKeys.all, 'settings'] as const,
}

/** One page after another of the traces matching the filters, newest first. */
export function useNexoraTraces(scope: TraceScopeKey, filters: TraceListFilters) {
  return useInfiniteQuery({
    queryKey: nexoraTraceKeys.list(scope, filters),
    queryFn: ({ pageParam, signal }) => {
      const query = { ...filters, ...(pageParam ? { cursor: pageParam } : {}) }
      return scope === 'instance'
        ? requestJson(listInstanceTracesContract, { query, signal })
        : requestJson(listWorkspaceTracesContract, {
            query: { ...query, workspaceId: scope },
            signal,
          })
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    placeholderData: keepPreviousData,
    refetchInterval: TRACES_REFRESH_MS,
    enabled: Boolean(scope),
  })
}

export function useNexoraTrace(scope: TraceScopeKey, traceId: string | null) {
  return useQuery({
    queryKey: nexoraTraceKeys.detail(scope, traceId ?? ''),
    queryFn: ({ signal }) =>
      scope === 'instance'
        ? requestJson(getInstanceTraceContract, { params: { traceId: traceId ?? '' }, signal })
        : requestJson(getWorkspaceTraceContract, {
            params: { traceId: traceId ?? '' },
            query: { workspaceId: scope },
            signal,
          }),
    enabled: Boolean(scope && traceId),
    staleTime: TRACE_DETAIL_STALE_TIME,
  })
}

export function useNexoraTraceFacets(workspaceId: string) {
  return useQuery({
    queryKey: nexoraTraceKeys.facets(workspaceId),
    queryFn: ({ signal }) =>
      requestJson(listWorkspaceTraceFacetsContract, { query: { workspaceId }, signal }),
    enabled: Boolean(workspaceId),
    staleTime: TRACE_FACETS_STALE_TIME,
  })
}

/**
 * The trace settings; `null` for a person who is not an instance administrator (the route
 * answers 403), so the settings button stays hidden for them.
 */
export function useNexoraTraceSettings() {
  return useQuery({
    queryKey: nexoraTraceKeys.settings(),
    queryFn: async ({ signal }) => {
      try {
        return await requestJson(getTraceSettingsContract, { signal })
      } catch (error) {
        if (isApiClientError(error) && (error.status === 403 || error.status === 401)) return null
        throw error
      }
    },
    staleTime: TRACE_SETTINGS_STALE_TIME,
  })
}

export function useUpdateNexoraTraceSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: NexoraTraceSettingsChange) =>
      requestJson(updateTraceSettingsContract, { body }),
    onSuccess: (data) => queryClient.setQueryData(nexoraTraceKeys.settings(), data),
  })
}

export function useTestNexoraTraceExport() {
  return useMutation({ mutationFn: () => requestJson(testTraceExportContract, {}) })
}

export function usePurgeNexoraTraces() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { workspaceId?: string }) => requestJson(purgeTracesContract, { body }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: nexoraTraceKeys.lists() }),
  })
}
