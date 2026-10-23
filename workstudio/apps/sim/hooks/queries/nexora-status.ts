'use client'

import { useQuery } from '@tanstack/react-query'
import { requestJson } from '@/lib/api/client/request'
import { getNexoraStatusContract } from '@/lib/api/contracts/nexora-status'

const NEXORA_STATUS_STALE_TIME = 30 * 1000

const nexoraStatusKeys = {
  all: ['nexora-status'] as const,
  details: () => [...nexoraStatusKeys.all, 'detail'] as const,
}

/** The health of the instance: services, version, free disk space. Instance admins only. */
export function useNexoraInstanceStatus() {
  return useQuery({
    queryKey: nexoraStatusKeys.details(),
    queryFn: ({ signal }) => requestJson(getNexoraStatusContract, { signal }),
    staleTime: NEXORA_STATUS_STALE_TIME,
  })
}
