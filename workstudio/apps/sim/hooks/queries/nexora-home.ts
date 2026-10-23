'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { requestJson } from '@/lib/api/client/request'
import type { ContractJsonResponse } from '@/lib/api/contracts'
import {
  getNexoraHomeContract,
  updateNexoraOnboardingContract,
} from '@/lib/api/contracts/nexora-home'
import { executeWorkflowSyncContract } from '@/lib/api/contracts/workflows'
import { DEFAULT_MODEL_ALIAS } from '@/lib/nexora/model-ids'
import type { OnboardingStep } from '@/lib/nexora/onboarding-steps'
import {
  type PlaygroundErrorCode,
  streamPlaygroundAnswer,
} from '@/app/workspace/[workspaceId]/playground/stream-answer'
import { logKeys } from '@/hooks/queries/logs'

const NEXORA_HOME_STALE_TIME = 60 * 1000

const nexoraHomeKeys = {
  all: ['nexora-home'] as const,
  state: () => [...nexoraHomeKeys.all, 'state'] as const,
}

type NexoraHomeState = ContractJsonResponse<typeof getNexoraHomeContract>

/** The home page's status: default model and, for instance admins, the first-launch progress. */
export function useNexoraHome() {
  return useQuery({
    queryKey: nexoraHomeKeys.state(),
    queryFn: ({ signal }) => requestJson(getNexoraHomeContract, { signal }),
    staleTime: NEXORA_HOME_STALE_TIME,
  })
}

/**
 * Which model usages have a model on this instance (`null` while Nexora API does not answer), from
 * the home status: the block editor's Nexora provider reads it too.
 */
export function useNexoraModelUsages(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: nexoraHomeKeys.state(),
    queryFn: ({ signal }) => requestJson(getNexoraHomeContract, { signal }),
    staleTime: NEXORA_HOME_STALE_TIME,
    enabled: options?.enabled ?? true,
    select: (home) => home.modelUsages,
  })
}

interface OnboardingChange {
  complete?: OnboardingStep
  dismissed?: boolean
}

/** Records a first-launch step, or hides/reopens the panel (instance admins only). */
export function useUpdateNexoraOnboarding() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (change: OnboardingChange) =>
      requestJson(updateNexoraOnboardingContract, { body: change }),
    onSuccess: ({ onboarding }) => {
      queryClient.setQueryData(nexoraHomeKeys.state(), (current: NexoraHomeState | undefined) =>
        current ? { ...current, onboarding } : current
      )
    },
  })
}

interface RunWorkflowVariables {
  workflowId: string
  input: Record<string, string>
}

/** Runs a workflow's current draft once and waits for its final output (first-launch example). */
export function useRunWorkflowOnce() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ workflowId, input }: RunWorkflowVariables) =>
      requestJson(executeWorkflowSyncContract, {
        params: { id: workflowId },
        body: { useDraftState: true, stream: false, input },
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: logKeys.lists() })
    },
  })
}

const DEFAULT_MODEL = `vllm/${DEFAULT_MODEL_ALIAS}`
const MODEL_TEST_TEMPERATURE = 0.2
const MODEL_TEST_MAX_TOKENS = 64

/** The default model did not answer the test question; `code` says why. */
export class DefaultModelTestError extends Error {
  readonly code: PlaygroundErrorCode

  constructor(code: PlaygroundErrorCode) {
    super(`The default model test failed (${code})`)
    this.name = 'DefaultModelTestError'
    this.code = code
  }
}

interface TestDefaultModelVariables {
  workspaceId: string
  question: string
}

/**
 * Asks the default model one short question through the Playground route (any workspace member
 * may call it), and resolves with the whole reply and how long it took.
 */
export function useTestDefaultModel() {
  return useMutation({
    mutationFn: async ({ workspaceId, question }: TestDefaultModelVariables) => {
      const startedAt = performance.now()
      let reply = ''
      const outcome = await streamPlaygroundAnswer({
        body: {
          workspaceId,
          model: DEFAULT_MODEL,
          messages: [{ role: 'user', content: question }],
          temperature: MODEL_TEST_TEMPERATURE,
          maxTokens: MODEL_TEST_MAX_TOKENS,
        },
        signal: new AbortController().signal,
        onChunk: (chunk) => {
          reply += chunk
        },
      })
      if (outcome.status === 'error') throw new DefaultModelTestError(outcome.code)
      if (outcome.status !== 'done' || !reply.trim()) throw new DefaultModelTestError('interrupted')
      return { reply: reply.trim(), latencyMs: performance.now() - startedAt }
    },
  })
}
