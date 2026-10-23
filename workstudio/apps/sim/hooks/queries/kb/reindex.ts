'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { requestJson } from '@/lib/api/client/request'
import type { ContractJsonResponse } from '@/lib/api/contracts'
import {
  getKnowledgeReindexContract,
  listKnowledgeEmbeddingModelsContract,
  startKnowledgeReindexContract,
} from '@/lib/api/contracts/knowledge'
import { knowledgeKeys } from '@/hooks/queries/utils/knowledge-keys'

const reindexKeys = {
  all: [...knowledgeKeys.all, 'reindex'] as const,
  state: (knowledgeBaseId: string) => [...reindexKeys.all, 'state', knowledgeBaseId] as const,
  models: (knowledgeBaseId: string) => [...reindexKeys.all, 'models', knowledgeBaseId] as const,
}

const KNOWLEDGE_REINDEX_STALE_TIME = 10 * 1000
const KNOWLEDGE_EMBEDDING_MODELS_STALE_TIME = 60 * 1000
/** Progress refresh while a reindex runs. */
const REINDEX_POLL_INTERVAL_MS = 3000
/** A stalled reindex is often waiting for its model server: it is checked on, slowly. */
const STALLED_REINDEX_POLL_INTERVAL_MS = 60_000

export type KnowledgeReindexView = ContractJsonResponse<typeof getKnowledgeReindexContract>['data']

async function fetchReindex(knowledgeBaseId: string, signal?: AbortSignal) {
  const response = await requestJson(getKnowledgeReindexContract, {
    params: { id: knowledgeBaseId },
    signal,
  })
  return response.data
}

/** How often to refresh a base's reindex: while it runs, slowly once it looks stalled. */
export function reindexPollInterval(
  reindex: { status: string; stalled: boolean } | null | undefined
): number | false {
  if (reindex?.status !== 'running') return false
  return reindex.stalled ? STALLED_REINDEX_POLL_INTERVAL_MS : REINDEX_POLL_INTERVAL_MS
}

/** A base's embedding model and its latest reindex, refreshed every few seconds while it runs. */
export function useKnowledgeReindex(knowledgeBaseId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: reindexKeys.state(knowledgeBaseId),
    queryFn: ({ signal }) => fetchReindex(knowledgeBaseId, signal),
    enabled: Boolean(knowledgeBaseId) && (options?.enabled ?? true),
    staleTime: KNOWLEDGE_REINDEX_STALE_TIME,
    refetchInterval: (query) => reindexPollInterval(query.state.data?.reindex),
  })
}

async function fetchEmbeddingModels(knowledgeBaseId: string, signal?: AbortSignal) {
  const response = await requestJson(listKnowledgeEmbeddingModelsContract, {
    params: { id: knowledgeBaseId },
    signal,
  })
  return response.data.models
}

/** Embedding models of the instance's Ollama the base can be reindexed with. */
export function useKnowledgeEmbeddingModels(
  knowledgeBaseId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: reindexKeys.models(knowledgeBaseId),
    queryFn: ({ signal }) => fetchEmbeddingModels(knowledgeBaseId, signal),
    enabled: Boolean(knowledgeBaseId) && (options?.enabled ?? true),
    staleTime: KNOWLEDGE_EMBEDDING_MODELS_STALE_TIME,
  })
}

interface StartReindexVariables {
  knowledgeBaseId: string
  model: string
}

/** Starts re-embedding a base with another model; its progress then shows on the base. */
export function useStartKnowledgeReindex() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ knowledgeBaseId, model }: StartReindexVariables) => {
      const response = await requestJson(startKnowledgeReindexContract, {
        params: { id: knowledgeBaseId },
        body: { model },
      })
      return response.data
    },
    onSuccess: (data, { knowledgeBaseId }) => {
      queryClient.setQueryData(reindexKeys.state(knowledgeBaseId), data)
    },
  })
}
