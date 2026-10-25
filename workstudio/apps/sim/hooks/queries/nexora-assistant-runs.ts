'use client'

import { useMutation } from '@tanstack/react-query'
import { requestJson } from '@/lib/api/client/request'
import { executeWorkflowSyncContract } from '@/lib/api/contracts/workflows'
import { readRunResult } from '@/lib/nexora/assistant/workflow-run'

/**
 * Runs the deployed version of a published workflow and reads its result (or its pause). Kept
 * apart from the Assistant's other hooks: the run contract is heavy, and only the launcher, which
 * the page loads on demand, needs it.
 */
export function useRunAssistantWorkflow() {
  return useMutation({
    mutationFn: async ({
      workflowId,
      input,
      signal,
    }: {
      workflowId: string
      input: Record<string, unknown>
      signal?: AbortSignal
    }) => {
      const body = await requestJson(executeWorkflowSyncContract, {
        params: { id: workflowId },
        body: { useDraftState: false, stream: false, input },
        signal,
      })
      return readRunResult(body)
    },
  })
}
