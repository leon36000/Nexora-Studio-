'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { requestJson } from '@/lib/api/client/request'
import type { ContractJsonResponse } from '@/lib/api/contracts'
import {
  getNexoraHomeContract,
  updateNexoraOnboardingContract,
} from '@/lib/api/contracts/nexora-home'
import { executeWorkflowSyncContract } from '@/lib/api/contracts/workflows'
import type { OnboardingStep } from '@/lib/nexora/onboarding-steps'
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
