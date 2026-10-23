'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isApiClientError } from '@/lib/api/client/errors'
import { requestJson } from '@/lib/api/client/request'
import {
  type AppendAssistantMessageBody,
  ASSISTANT_AGENT_UNPUBLISHED_CODE,
  appendAssistantMessageContract,
  type CreateAssistantConversationBody,
  createAssistantConversationContract,
  deleteAssistantConversationContract,
  getAssistantConversationContract,
  listAssistantAgentsContract,
  listAssistantConversationsContract,
  type RenameAssistantConversationBody,
  renameAssistantConversationContract,
} from '@/lib/api/contracts/nexora-assistant'

const ASSISTANT_AGENTS_STALE_TIME = 60 * 1000
const ASSISTANT_CONVERSATIONS_STALE_TIME = 30 * 1000
const ASSISTANT_CONVERSATION_STALE_TIME = 30 * 1000

const assistantKeys = {
  all: ['nexora-assistant'] as const,
  agentLists: () => [...assistantKeys.all, 'agents'] as const,
  agents: (workspaceId?: string) => [...assistantKeys.agentLists(), workspaceId ?? ''] as const,
  lists: () => [...assistantKeys.all, 'conversations'] as const,
  list: (workspaceId?: string) => [...assistantKeys.lists(), workspaceId ?? ''] as const,
  details: () => [...assistantKeys.all, 'conversation'] as const,
  detail: (conversationId?: string) => [...assistantKeys.details(), conversationId ?? ''] as const,
}

/** The workspace's published agents (the `Agents` folder, with an active deployed chat). */
export function useAssistantAgents(workspaceId?: string) {
  return useQuery({
    queryKey: assistantKeys.agents(workspaceId),
    queryFn: async ({ signal }) => {
      const data = await requestJson(listAssistantAgentsContract, {
        query: { workspaceId: workspaceId as string },
        signal,
      })
      return data.agents
    },
    enabled: Boolean(workspaceId),
    staleTime: ASSISTANT_AGENTS_STALE_TIME,
  })
}

/** The caller's own conversations in the workspace, most recently active first. */
export function useAssistantConversations(workspaceId?: string) {
  return useQuery({
    queryKey: assistantKeys.list(workspaceId),
    queryFn: async ({ signal }) => {
      const data = await requestJson(listAssistantConversationsContract, {
        query: { workspaceId: workspaceId as string },
        signal,
      })
      return data.conversations
    },
    enabled: Boolean(workspaceId),
    staleTime: ASSISTANT_CONVERSATIONS_STALE_TIME,
  })
}

/** One conversation with its messages; `agent` is `null` once the agent is unpublished. */
export function useAssistantConversation(conversationId?: string) {
  return useQuery({
    queryKey: assistantKeys.detail(conversationId),
    queryFn: ({ signal }) =>
      requestJson(getAssistantConversationContract, {
        params: { id: conversationId as string },
        signal,
      }),
    enabled: Boolean(conversationId),
    staleTime: ASSISTANT_CONVERSATION_STALE_TIME,
  })
}

/** The agent of the conversation is no longer published (`agent-unpublished`). */
export function isAgentUnpublishedError(error: unknown): boolean {
  return isApiClientError(error) && error.code === ASSISTANT_AGENT_UNPUBLISHED_CODE
}

/** Fails with `ApiClientError.code === 'agent-unpublished'` when the agent is no longer published. */
export function useCreateAssistantConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateAssistantConversationBody) => {
      const data = await requestJson(createAssistantConversationContract, { body })
      return data.conversation
    },
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: assistantKeys.list(conversation.workspaceId) })
    },
    onError: (error, body) => {
      if (isAgentUnpublishedError(error)) {
        queryClient.invalidateQueries({ queryKey: assistantKeys.agents(body.workspaceId) })
      }
    },
  })
}

export function useRenameAssistantConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      conversationId,
      ...body
    }: RenameAssistantConversationBody & { conversationId: string }) => {
      const data = await requestJson(renameAssistantConversationContract, {
        params: { id: conversationId },
        body,
      })
      return data.conversation
    },
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: assistantKeys.list(conversation.workspaceId) })
      queryClient.invalidateQueries({ queryKey: assistantKeys.detail(conversation.id) })
    },
  })
}

export function useDeleteAssistantConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (conversationId: string) =>
      requestJson(deleteAssistantConversationContract, { params: { id: conversationId } }),
    onSuccess: (_data, conversationId) => {
      queryClient.removeQueries({ queryKey: assistantKeys.detail(conversationId) })
      queryClient.invalidateQueries({ queryKey: assistantKeys.lists() })
    },
  })
}

/**
 * Records a question or an answer. Fails with `ApiClientError.code === 'agent-unpublished'`
 * once the conversation's agent is no longer published (the conversation is then reloaded, read
 * only). `keepalive` lets the request outlive a closing tab.
 */
export function useAppendAssistantMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      conversationId,
      keepalive,
      ...body
    }: AppendAssistantMessageBody & { conversationId: string; keepalive?: boolean }) => {
      const data = await requestJson(appendAssistantMessageContract, {
        params: { id: conversationId },
        body,
        keepalive,
      })
      return data.message
    },
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: assistantKeys.detail(message.conversationId) })
      queryClient.invalidateQueries({ queryKey: assistantKeys.lists() })
    },
    onError: (error, { conversationId }) => {
      if (isAgentUnpublishedError(error)) {
        queryClient.invalidateQueries({ queryKey: assistantKeys.detail(conversationId) })
      }
    },
  })
}
