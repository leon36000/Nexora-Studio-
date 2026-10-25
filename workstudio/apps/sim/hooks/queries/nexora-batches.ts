'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { requestJson } from '@/lib/api/client/request'
import {
  type CreateNexoraBatchBody,
  cancelBatchContract,
  createBatchContract,
  deleteBatchContract,
  getBatchContract,
  listBatchesContract,
  listBatchSourcesContract,
} from '@/lib/api/contracts/nexora-batches'

/** Batches change on their own while they run: the list is read again this often until all ended. */
const ACTIVE_BATCH_REFETCH_MS = 3000
/** A batch's progress is only ever read while a person looks at it. */
const BATCHES_STALE_TIME = 5 * 1000
/** Tables and their columns change when someone edits the workspace. */
const SOURCES_STALE_TIME = 30 * 1000
/** A just-imported CSV table fills in the background: its row count is read again this often. */
const IMPORT_REFETCH_MS = 2000
/** The results shown on a batch's page; the whole batch is in the CSV export. */
export const BATCH_RESULTS_SHOWN = 200

const batchKeys = {
  all: ['nexora-batches'] as const,
  lists: () => [...batchKeys.all, 'list'] as const,
  list: (workspaceId: string) => [...batchKeys.lists(), workspaceId] as const,
  details: () => [...batchKeys.all, 'detail'] as const,
  detail: (workspaceId: string, batchId: string) =>
    [...batchKeys.details(), workspaceId, batchId] as const,
  sources: (workspaceId: string) => [...batchKeys.all, 'sources', workspaceId] as const,
}

const isActive = (status: string | undefined) => status === 'in_progress' || status === 'cancelling'

export function useBatches(workspaceId: string) {
  return useQuery({
    queryKey: batchKeys.list(workspaceId),
    queryFn: async ({ signal }) =>
      (await requestJson(listBatchesContract, { query: { workspaceId }, signal })).batches,
    enabled: Boolean(workspaceId),
    staleTime: BATCHES_STALE_TIME,
    refetchInterval: (query) =>
      query.state.data?.some((batch) => isActive(batch.status)) ? ACTIVE_BATCH_REFETCH_MS : false,
  })
}

export function useBatch(workspaceId: string, batchId: string) {
  return useQuery({
    queryKey: batchKeys.detail(workspaceId, batchId),
    queryFn: ({ signal }) =>
      requestJson(getBatchContract, {
        params: { batchId },
        query: { workspaceId, after: -1, limit: BATCH_RESULTS_SHOWN },
        signal,
      }),
    enabled: Boolean(workspaceId && batchId),
    staleTime: BATCHES_STALE_TIME,
    placeholderData: keepPreviousData,
    refetchInterval: (query) =>
      isActive(query.state.data?.batch.status) ? ACTIVE_BATCH_REFETCH_MS : false,
  })
}

/** The tables a batch can process; `watchTableId` keeps reading while that imported table is empty. */
export function useBatchSources(workspaceId: string, enabled: boolean, watchTableId?: string) {
  return useQuery({
    queryKey: batchKeys.sources(workspaceId),
    queryFn: async ({ signal }) =>
      (await requestJson(listBatchSourcesContract, { query: { workspaceId }, signal })).tables,
    enabled: enabled && Boolean(workspaceId),
    staleTime: SOURCES_STALE_TIME,
    refetchInterval: (query) => {
      if (!watchTableId) return false
      const watched = query.state.data?.find((table) => table.id === watchTableId)
      return !watched || watched.rowCount === 0 ? IMPORT_REFETCH_MS : false
    },
  })
}

function useInvalidateBatches() {
  const queryClient = useQueryClient()
  return (workspaceId: string) => {
    void queryClient.invalidateQueries({ queryKey: batchKeys.list(workspaceId) })
    void queryClient.invalidateQueries({ queryKey: batchKeys.details() })
    void queryClient.invalidateQueries({ queryKey: batchKeys.sources(workspaceId) })
  }
}

export function useCreateBatch() {
  const invalidate = useInvalidateBatches()
  return useMutation({
    mutationFn: (body: CreateNexoraBatchBody) => requestJson(createBatchContract, { body }),
    onSuccess: (_data, { workspaceId }) => invalidate(workspaceId),
  })
}

export function useCancelBatch() {
  const invalidate = useInvalidateBatches()
  return useMutation({
    mutationFn: ({ workspaceId, batchId }: { workspaceId: string; batchId: string }) =>
      requestJson(cancelBatchContract, { params: { batchId }, body: { workspaceId } }),
    onSuccess: (_data, { workspaceId }) => invalidate(workspaceId),
  })
}

export function useDeleteBatch() {
  const invalidate = useInvalidateBatches()
  return useMutation({
    mutationFn: ({ workspaceId, batchId }: { workspaceId: string; batchId: string }) =>
      requestJson(deleteBatchContract, { params: { batchId }, query: { workspaceId } }),
    onSuccess: (_data, { workspaceId }) => invalidate(workspaceId),
  })
}
