'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { requestJson } from '@/lib/api/client/request'
import {
  type CreateNexoraPromptBody,
  type CreateNexoraPromptVersionBody,
  createNexoraPromptContract,
  createNexoraPromptVersionContract,
  deleteNexoraPromptContract,
  getNexoraPromptContract,
  listNexoraPromptsContract,
  moveNexoraPromptLabelContract,
} from '@/lib/api/contracts/nexora-prompts'
import type { PromptLabel } from '@/lib/nexora/prompts/template'

/** Prompts change when someone saves a version or moves a label: a page revisit after 30 s refetches. */
const NEXORA_PROMPTS_STALE_TIME = 30 * 1000

const nexoraPromptKeys = {
  all: ['nexora-prompts'] as const,
  lists: () => [...nexoraPromptKeys.all, 'list'] as const,
  list: (workspaceId: string) => [...nexoraPromptKeys.lists(), workspaceId] as const,
  details: () => [...nexoraPromptKeys.all, 'detail'] as const,
  detail: (workspaceId: string, promptId: string) =>
    [...nexoraPromptKeys.details(), workspaceId, promptId] as const,
}

/** The workspace's prompts, with where each label points. */
export function useNexoraPrompts(workspaceId: string) {
  return useQuery({
    queryKey: nexoraPromptKeys.list(workspaceId),
    queryFn: async ({ signal }) =>
      (await requestJson(listNexoraPromptsContract, { query: { workspaceId }, signal })).prompts,
    enabled: Boolean(workspaceId),
    staleTime: NEXORA_PROMPTS_STALE_TIME,
  })
}

/** One prompt with every version, newest first. */
export function useNexoraPrompt(workspaceId: string, promptId: string | null) {
  return useQuery({
    queryKey: nexoraPromptKeys.detail(workspaceId, promptId ?? ''),
    queryFn: async ({ signal }) =>
      (
        await requestJson(getNexoraPromptContract, {
          params: { promptId: promptId ?? '' },
          query: { workspaceId },
          signal,
        })
      ).prompt,
    enabled: Boolean(workspaceId && promptId),
    staleTime: NEXORA_PROMPTS_STALE_TIME,
  })
}

function useInvalidatePrompt() {
  const queryClient = useQueryClient()
  return (workspaceId: string, promptId?: string) => {
    void queryClient.invalidateQueries({ queryKey: nexoraPromptKeys.list(workspaceId) })
    if (promptId) {
      void queryClient.invalidateQueries({
        queryKey: nexoraPromptKeys.detail(workspaceId, promptId),
      })
    }
  }
}

export function useCreateNexoraPrompt() {
  const invalidate = useInvalidatePrompt()
  return useMutation({
    mutationFn: (body: CreateNexoraPromptBody) => requestJson(createNexoraPromptContract, { body }),
    onSuccess: (_data, body) => invalidate(body.workspaceId),
  })
}

export function useCreateNexoraPromptVersion() {
  const invalidate = useInvalidatePrompt()
  return useMutation({
    mutationFn: ({ promptId, ...body }: CreateNexoraPromptVersionBody & { promptId: string }) =>
      requestJson(createNexoraPromptVersionContract, { params: { promptId }, body }),
    onSuccess: (_data, { workspaceId, promptId }) => invalidate(workspaceId, promptId),
  })
}

export function useMoveNexoraPromptLabel() {
  const invalidate = useInvalidatePrompt()
  return useMutation({
    mutationFn: ({
      promptId,
      ...body
    }: {
      workspaceId: string
      promptId: string
      label: PromptLabel
      version: number
    }) => requestJson(moveNexoraPromptLabelContract, { params: { promptId }, body }),
    onSuccess: (_data, { workspaceId, promptId }) => invalidate(workspaceId, promptId),
  })
}

export function useDeleteNexoraPrompt() {
  const invalidate = useInvalidatePrompt()
  return useMutation({
    mutationFn: ({ workspaceId, promptId }: { workspaceId: string; promptId: string }) =>
      requestJson(deleteNexoraPromptContract, { params: { promptId }, query: { workspaceId } }),
    onSuccess: (_data, { workspaceId }) => invalidate(workspaceId),
  })
}
