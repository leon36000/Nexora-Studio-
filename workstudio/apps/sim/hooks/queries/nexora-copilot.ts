'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { requestJson } from '@/lib/api/client/request'
import {
  type CreateCopilotWorkflowBody,
  createCopilotWorkflowContract,
  type GenerateCopilotPlanBody,
  generateCopilotPlanContract,
} from '@/lib/api/contracts/nexora-copilot'
import { invalidateWorkflowLists } from '@/hooks/queries/utils/invalidate-workflow-lists'

interface GenerateCopilotPlanVariables extends GenerateCopilotPlanBody {
  /** Aborting it cancels the wait (the model can take a minute on a CPU). */
  signal?: AbortSignal
}

/**
 * Drafts a workflow plan from a description, or applies a described change to `currentPlan`.
 * Stores nothing: the error's `code` (`plan-invalid`, `rejected`, `unavailable`) tells the dialog what to show.
 */
export function useGenerateCopilotPlan() {
  return useMutation({
    mutationFn: ({ signal, ...body }: GenerateCopilotPlanVariables) =>
      requestJson(generateCopilotPlanContract, { body, signal }),
  })
}

/** Creates the workflow a reviewed plan describes; resolves with its id and the warnings. */
export function useCreateCopilotWorkflow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateCopilotWorkflowBody) =>
      requestJson(createCopilotWorkflowContract, { body }),
    onSuccess: (_data, { workspaceId }) => invalidateWorkflowLists(queryClient, workspaceId),
  })
}
