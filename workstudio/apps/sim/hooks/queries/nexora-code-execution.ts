'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { requestJson } from '@/lib/api/client/request'
import { getNexoraAgentToolsContract } from '@/lib/api/contracts/nexora-agent-tools'
import {
  getNexoraCodeExecutionContract,
  updateNexoraCodeExecutionContract,
} from '@/lib/api/contracts/nexora-code-execution'

const NEXORA_CODE_EXECUTION_STALE_TIME = 15 * 1000

const nexoraCodeExecutionKeys = {
  all: ['nexora-code-execution'] as const,
  detail: () => [...nexoraCodeExecutionKeys.all, 'detail'] as const,
}

/** Whether the Python interpreter is installed and allowed. Instance admins only. */
export function useNexoraCodeExecution() {
  return useQuery({
    queryKey: nexoraCodeExecutionKeys.detail(),
    queryFn: ({ signal }) => requestJson(getNexoraCodeExecutionContract, { signal }),
    staleTime: NEXORA_CODE_EXECUTION_STALE_TIME,
  })
}

export function useUpdateNexoraCodeExecution() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (enabled: boolean) =>
      requestJson(updateNexoraCodeExecutionContract, { body: { enabled } }),
    onSuccess: (view) => queryClient.setQueryData(nexoraCodeExecutionKeys.detail(), view),
  })
}

const nexoraAgentToolsKeys = {
  all: ['nexora-agent-tools'] as const,
}

/** Which built-in tools (Python interpreter, web search) agents can use on this instance. */
export function useNexoraAgentTools() {
  return useQuery({
    queryKey: nexoraAgentToolsKeys.all,
    queryFn: ({ signal }) => requestJson(getNexoraAgentToolsContract, { signal }),
    staleTime: NEXORA_CODE_EXECUTION_STALE_TIME,
  })
}
