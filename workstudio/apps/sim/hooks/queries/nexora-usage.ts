'use client'

import { useQuery } from '@tanstack/react-query'
import { requestJson } from '@/lib/api/client/request'
import { getNexoraUsageContract } from '@/lib/api/contracts/nexora-usage'

const NEXORA_USAGE_STALE_TIME = 60 * 1000

const nexoraUsageKeys = {
  all: ['nexora-usage'] as const,
  period: (days: number) => [...nexoraUsageKeys.all, days] as const,
}

/** Model consumption of this instance over the last `days` days, from Nexora API. */
export function useNexoraUsage(days: number) {
  return useQuery({
    queryKey: nexoraUsageKeys.period(days),
    queryFn: ({ signal }) =>
      requestJson(getNexoraUsageContract, { query: { days: String(days) }, signal }),
    staleTime: NEXORA_USAGE_STALE_TIME,
  })
}
