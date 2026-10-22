import { useQuery } from '@tanstack/react-query'
import { requestJson } from '@/lib/api/client/request'
import { type CustomBlock, listCustomBlocksContract } from '@/lib/api/contracts/custom-blocks'

export const CUSTOM_BLOCK_LIST_STALE_TIME = 60 * 1000
/** Short — the usage count is a pre-delete safety check and must stay fresh. */
export const CUSTOM_BLOCK_USAGES_STALE_TIME = 30 * 1000

const customBlockKeys = {
  all: ['custom-blocks'] as const,
  lists: () => [...customBlockKeys.all, 'list'] as const,
  list: (workspaceId?: string) => [...customBlockKeys.lists(), workspaceId ?? ''] as const,
  usages: (id?: string) => [...customBlockKeys.all, 'usages', id ?? ''] as const,
}

interface CustomBlocksResult {
  enabled: boolean
  customBlocks: CustomBlock[]
}

async function fetchCustomBlocks(
  workspaceId: string,
  signal?: AbortSignal
): Promise<CustomBlocksResult> {
  return requestJson(listCustomBlocksContract, { query: { workspaceId }, signal })
}

function useCustomBlocksQuery<T>(
  workspaceId: string | undefined,
  select: (r: CustomBlocksResult) => T
) {
  return useQuery({
    queryKey: customBlockKeys.list(workspaceId),
    queryFn: ({ signal }) => fetchCustomBlocks(workspaceId as string, signal),
    enabled: Boolean(workspaceId),
    staleTime: CUSTOM_BLOCK_LIST_STALE_TIME,
    select,
  })
}

/** Org custom blocks (with live-derived input fields) available in this workspace. */
export function useCustomBlocks(workspaceId?: string) {
  return useCustomBlocksQuery(workspaceId, (r) => r.customBlocks)
}
