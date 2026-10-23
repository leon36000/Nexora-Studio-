'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isApiClientError } from '@/lib/api/client/errors'
import { requestJson } from '@/lib/api/client/request'
import {
  type CreateInstanceNexoraApiKeyBody,
  type CreateWorkspaceNexoraApiKeyBody,
  createInstanceNexoraApiKeyContract,
  createWorkspaceNexoraApiKeyContract,
  listInstanceNexoraApiKeysContract,
  listWorkspaceNexoraApiKeysContract,
  revokeInstanceNexoraApiKeyContract,
  revokeWorkspaceNexoraApiKeyContract,
} from '@/lib/api/contracts/nexora-api-keys'

/** Usage figures move with every call: refreshed when the page is revisited after a minute. */
const NEXORA_API_KEYS_STALE_TIME = 60 * 1000

const nexoraApiKeyKeys = {
  all: ['nexora-api-keys'] as const,
  workspace: (workspaceId: string) => [...nexoraApiKeyKeys.all, 'workspace', workspaceId] as const,
  instance: () => [...nexoraApiKeyKeys.all, 'instance'] as const,
}

/** The workspace's developer API keys. */
export function useWorkspaceNexoraApiKeys(workspaceId: string) {
  return useQuery({
    queryKey: nexoraApiKeyKeys.workspace(workspaceId),
    queryFn: ({ signal }) =>
      requestJson(listWorkspaceNexoraApiKeysContract, { query: { workspaceId }, signal }),
    enabled: Boolean(workspaceId),
    staleTime: NEXORA_API_KEYS_STALE_TIME,
  })
}

/**
 * The instance's keys; `null` for a person who is not an instance administrator (the route
 * answers 403), so the section stays hidden for them.
 */
export function useInstanceNexoraApiKeys() {
  return useQuery({
    queryKey: nexoraApiKeyKeys.instance(),
    queryFn: async ({ signal }) => {
      try {
        return await requestJson(listInstanceNexoraApiKeysContract, { signal })
      } catch (error) {
        if (isApiClientError(error) && (error.status === 403 || error.status === 401)) return null
        throw error
      }
    },
    staleTime: NEXORA_API_KEYS_STALE_TIME,
  })
}

export function useCreateWorkspaceNexoraApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateWorkspaceNexoraApiKeyBody) =>
      requestJson(createWorkspaceNexoraApiKeyContract, { body }),
    onSuccess: (_data, body) =>
      queryClient.invalidateQueries({ queryKey: nexoraApiKeyKeys.workspace(body.workspaceId) }),
  })
}

export function useRevokeWorkspaceNexoraApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ workspaceId, keyId }: { workspaceId: string; keyId: string }) =>
      requestJson(revokeWorkspaceNexoraApiKeyContract, {
        params: { keyId },
        query: { workspaceId },
      }),
    onSuccess: (_data, { workspaceId }) =>
      queryClient.invalidateQueries({ queryKey: nexoraApiKeyKeys.workspace(workspaceId) }),
  })
}

export function useCreateInstanceNexoraApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateInstanceNexoraApiKeyBody) =>
      requestJson(createInstanceNexoraApiKeyContract, { body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: nexoraApiKeyKeys.instance() }),
  })
}

export function useRevokeInstanceNexoraApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ keyId }: { keyId: string }) =>
      requestJson(revokeInstanceNexoraApiKeyContract, { params: { keyId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: nexoraApiKeyKeys.instance() }),
  })
}
