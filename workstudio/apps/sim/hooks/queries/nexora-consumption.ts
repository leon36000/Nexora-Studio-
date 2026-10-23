'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { requestJson } from '@/lib/api/client/request'
import type { ContractJsonResponse } from '@/lib/api/contracts'
import {
  type ConsumptionPeriod,
  getNexoraBudgetsContract,
  getNexoraConsumptionContract,
  type UpdateNexoraBudgetsBody,
  updateNexoraBudgetsContract,
} from '@/lib/api/contracts/nexora-consumption'

const NEXORA_CONSUMPTION_STALE_TIME = 60 * 1000
const NEXORA_BUDGETS_STALE_TIME = 30 * 1000

const nexoraConsumptionKeys = {
  all: ['nexora-consumption'] as const,
  reports: () => [...nexoraConsumptionKeys.all, 'report'] as const,
  report: (days: ConsumptionPeriod) => [...nexoraConsumptionKeys.reports(), days] as const,
  budgets: () => [...nexoraConsumptionKeys.all, 'budgets'] as const,
}

export type NexoraConsumption = ContractJsonResponse<typeof getNexoraConsumptionContract>
export type NexoraBudgets = ContractJsonResponse<typeof getNexoraBudgetsContract>

/** The instance's consumption over the last `days` days. Instance admins only. */
export function useNexoraConsumption(days: ConsumptionPeriod) {
  return useQuery({
    queryKey: nexoraConsumptionKeys.report(days),
    queryFn: ({ signal }) =>
      requestJson(getNexoraConsumptionContract, {
        query: { days },
        signal,
      }),
    staleTime: NEXORA_CONSUMPTION_STALE_TIME,
    placeholderData: keepPreviousData,
  })
}

/** Monthly budgets and this month's usage against them. Instance admins only. */
export function useNexoraBudgets() {
  return useQuery({
    queryKey: nexoraConsumptionKeys.budgets(),
    queryFn: ({ signal }) => requestJson(getNexoraBudgetsContract, { signal }),
    staleTime: NEXORA_BUDGETS_STALE_TIME,
  })
}

export function useUpdateNexoraBudgets() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateNexoraBudgetsBody) =>
      requestJson(updateNexoraBudgetsContract, { body }),
    onSuccess: (budgets) => queryClient.setQueryData(nexoraConsumptionKeys.budgets(), budgets),
  })
}
