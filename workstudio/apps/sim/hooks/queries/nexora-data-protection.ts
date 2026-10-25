'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { requestJson } from '@/lib/api/client/request'
import type { ContractJsonResponse } from '@/lib/api/contracts'
import {
  getNexoraDataProtectionContract,
  type UpdateNexoraDataProtectionBody,
  updateNexoraDataProtectionContract,
} from '@/lib/api/contracts/nexora-data-protection'

const NEXORA_DATA_PROTECTION_STALE_TIME = 30 * 1000

const nexoraDataProtectionKeys = {
  all: ['nexora-data-protection'] as const,
  policy: () => [...nexoraDataProtectionKeys.all, 'policy'] as const,
}

export type NexoraDataProtection = ContractJsonResponse<typeof getNexoraDataProtectionContract>

/** The personal-data policy, the workspaces and the local service state. Instance admins only. */
export function useNexoraDataProtection() {
  return useQuery({
    queryKey: nexoraDataProtectionKeys.policy(),
    queryFn: ({ signal }) => requestJson(getNexoraDataProtectionContract, { signal }),
    staleTime: NEXORA_DATA_PROTECTION_STALE_TIME,
  })
}

export function useUpdateNexoraDataProtection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateNexoraDataProtectionBody) =>
      requestJson(updateNexoraDataProtectionContract, { body }),
    onSuccess: (overview) => queryClient.setQueryData(nexoraDataProtectionKeys.policy(), overview),
  })
}
