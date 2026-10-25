'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { requestJson } from '@/lib/api/client/request'
import {
  acknowledgeEvalAlertContract,
  appendEvalRowsContract,
  type CreateNexoraEvalCampaignBody,
  type CreateNexoraEvalDatasetBody,
  type CreateNexoraEvalJudgeBody,
  cancelEvalCampaignContract,
  compareEvalCampaignsContract,
  createEvalCampaignContract,
  createEvalDatasetContract,
  createEvalJudgeContract,
  createEvalScheduleContract,
  deleteEvalCampaignContract,
  deleteEvalDatasetContract,
  deleteEvalJudgeContract,
  deleteEvalRowContract,
  deleteEvalScheduleContract,
  getEvalCampaignContract,
  getEvalDatasetContract,
  listEvalAlertsContract,
  listEvalCampaignsContract,
  listEvalDatasetsContract,
  listEvalImportSourcesContract,
  listEvalJudgesContract,
  listEvalSchedulesContract,
  type NexoraEvalRowInput,
  type NexoraEvalScheduleBody,
  runEvalScheduleContract,
  type TryNexoraEvalJudgeBody,
  tryEvalJudgeContract,
  type UpdateNexoraEvalRowBody,
  updateEvalJudgeContract,
  updateEvalRowContract,
  updateEvalScheduleContract,
} from '@/lib/api/contracts/nexora-evaluations'

/** Test sets, judges and schedules change when someone edits them: a revisit after 30 s refetches. */
const EVALUATIONS_STALE_TIME = 30 * 1000
/** A campaign in progress is read again this often, until it ends. */
const ACTIVE_CAMPAIGN_REFETCH_MS = 3000

const evaluationKeys = {
  all: ['nexora-evaluations'] as const,
  datasets: (workspaceId: string) => [...evaluationKeys.all, 'datasets', workspaceId] as const,
  dataset: (workspaceId: string, datasetId: string) =>
    [...evaluationKeys.datasets(workspaceId), datasetId] as const,
  sources: (workspaceId: string) => [...evaluationKeys.all, 'sources', workspaceId] as const,
  judges: (workspaceId: string) => [...evaluationKeys.all, 'judges', workspaceId] as const,
  campaigns: (workspaceId: string) => [...evaluationKeys.all, 'campaigns', workspaceId] as const,
  campaign: (workspaceId: string, campaignId: string) =>
    [...evaluationKeys.campaigns(workspaceId), campaignId] as const,
  comparison: (workspaceId: string, a: string, b: string) =>
    [...evaluationKeys.all, 'comparison', workspaceId, a, b] as const,
  schedules: (workspaceId: string) => [...evaluationKeys.all, 'schedules', workspaceId] as const,
  alerts: (workspaceId: string) => [...evaluationKeys.all, 'alerts', workspaceId] as const,
}

const isActive = (status: string | undefined) => status === 'pending' || status === 'running'

function useInvalidateEvaluations() {
  const queryClient = useQueryClient()
  return (
    workspaceId: string,
    ...parts: ('datasets' | 'judges' | 'campaigns' | 'schedules' | 'alerts')[]
  ) => {
    for (const part of parts) {
      void queryClient.invalidateQueries({ queryKey: [...evaluationKeys.all, part, workspaceId] })
    }
  }
}

export function useEvalDatasets(workspaceId: string) {
  return useQuery({
    queryKey: evaluationKeys.datasets(workspaceId),
    queryFn: async ({ signal }) =>
      (await requestJson(listEvalDatasetsContract, { query: { workspaceId }, signal })).datasets,
    enabled: Boolean(workspaceId),
    staleTime: EVALUATIONS_STALE_TIME,
  })
}

export function useEvalDataset(workspaceId: string, datasetId: string, offset = 0) {
  return useQuery({
    queryKey: [...evaluationKeys.dataset(workspaceId, datasetId), offset],
    queryFn: ({ signal }) =>
      requestJson(getEvalDatasetContract, {
        params: { datasetId },
        query: { workspaceId, offset, limit: 200 },
        signal,
      }),
    enabled: Boolean(workspaceId && datasetId),
    staleTime: EVALUATIONS_STALE_TIME,
    placeholderData: keepPreviousData,
  })
}

/** What a member can import from: loaded only when the import window is open. */
export function useEvalImportSources(workspaceId: string, enabled: boolean) {
  return useQuery({
    queryKey: evaluationKeys.sources(workspaceId),
    queryFn: ({ signal }) =>
      requestJson(listEvalImportSourcesContract, { query: { workspaceId }, signal }),
    enabled: enabled && Boolean(workspaceId),
    staleTime: 0,
  })
}

export function useCreateEvalDataset() {
  const invalidate = useInvalidateEvaluations()
  return useMutation({
    mutationFn: (body: CreateNexoraEvalDatasetBody) =>
      requestJson(createEvalDatasetContract, { body }),
    onSuccess: (_data, body) => invalidate(body.workspaceId, 'datasets'),
  })
}

export function useDeleteEvalDataset() {
  const invalidate = useInvalidateEvaluations()
  return useMutation({
    mutationFn: ({ workspaceId, datasetId }: { workspaceId: string; datasetId: string }) =>
      requestJson(deleteEvalDatasetContract, { params: { datasetId }, query: { workspaceId } }),
    onSuccess: (_data, { workspaceId }) => invalidate(workspaceId, 'datasets'),
  })
}

export function useAppendEvalRows() {
  const invalidate = useInvalidateEvaluations()
  return useMutation({
    mutationFn: (input: { workspaceId: string; datasetId: string; rows: NexoraEvalRowInput[] }) =>
      requestJson(appendEvalRowsContract, {
        params: { datasetId: input.datasetId },
        body: { workspaceId: input.workspaceId, rows: input.rows },
      }),
    onSuccess: (_data, { workspaceId }) => invalidate(workspaceId, 'datasets'),
  })
}

export function useUpdateEvalRow() {
  const invalidate = useInvalidateEvaluations()
  return useMutation({
    mutationFn: ({
      datasetId,
      rowId,
      ...body
    }: UpdateNexoraEvalRowBody & { datasetId: string; rowId: string }) =>
      requestJson(updateEvalRowContract, { params: { datasetId, rowId }, body }),
    onSuccess: (_data, { workspaceId }) => invalidate(workspaceId, 'datasets'),
  })
}

export function useDeleteEvalRow() {
  const invalidate = useInvalidateEvaluations()
  return useMutation({
    mutationFn: (input: { workspaceId: string; datasetId: string; rowId: string }) =>
      requestJson(deleteEvalRowContract, {
        params: { datasetId: input.datasetId, rowId: input.rowId },
        query: { workspaceId: input.workspaceId },
      }),
    onSuccess: (_data, { workspaceId }) => invalidate(workspaceId, 'datasets'),
  })
}

export function useEvalJudges(workspaceId: string) {
  return useQuery({
    queryKey: evaluationKeys.judges(workspaceId),
    queryFn: async ({ signal }) =>
      (await requestJson(listEvalJudgesContract, { query: { workspaceId }, signal })).judges,
    enabled: Boolean(workspaceId),
    staleTime: EVALUATIONS_STALE_TIME,
  })
}

export function useSaveEvalJudge() {
  const invalidate = useInvalidateEvaluations()
  return useMutation({
    mutationFn: ({ judgeId, ...body }: CreateNexoraEvalJudgeBody & { judgeId?: string }) =>
      judgeId
        ? requestJson(updateEvalJudgeContract, { params: { judgeId }, body })
        : requestJson(createEvalJudgeContract, { body }),
    onSuccess: (_data, { workspaceId }) => invalidate(workspaceId, 'judges'),
  })
}

export function useDeleteEvalJudge() {
  const invalidate = useInvalidateEvaluations()
  return useMutation({
    mutationFn: ({ workspaceId, judgeId }: { workspaceId: string; judgeId: string }) =>
      requestJson(deleteEvalJudgeContract, { params: { judgeId }, query: { workspaceId } }),
    onSuccess: (_data, { workspaceId }) => invalidate(workspaceId, 'judges'),
  })
}

export function useTryEvalJudge() {
  return useMutation({
    mutationFn: (body: TryNexoraEvalJudgeBody) => requestJson(tryEvalJudgeContract, { body }),
  })
}

export function useEvalCampaigns(workspaceId: string) {
  return useQuery({
    queryKey: evaluationKeys.campaigns(workspaceId),
    queryFn: async ({ signal }) =>
      (await requestJson(listEvalCampaignsContract, { query: { workspaceId }, signal })).campaigns,
    enabled: Boolean(workspaceId),
    staleTime: EVALUATIONS_STALE_TIME,
    refetchInterval: (query) =>
      query.state.data?.some((campaign) => isActive(campaign.status))
        ? ACTIVE_CAMPAIGN_REFETCH_MS
        : false,
  })
}

export function useEvalCampaign(workspaceId: string, campaignId: string) {
  return useQuery({
    queryKey: evaluationKeys.campaign(workspaceId, campaignId),
    queryFn: ({ signal }) =>
      requestJson(getEvalCampaignContract, {
        params: { campaignId },
        query: { workspaceId },
        signal,
      }),
    enabled: Boolean(workspaceId && campaignId),
    staleTime: EVALUATIONS_STALE_TIME,
    refetchInterval: (query) =>
      isActive(query.state.data?.campaign.status) ? ACTIVE_CAMPAIGN_REFETCH_MS : false,
  })
}

export function useCreateEvalCampaign() {
  const invalidate = useInvalidateEvaluations()
  return useMutation({
    mutationFn: (body: CreateNexoraEvalCampaignBody) =>
      requestJson(createEvalCampaignContract, { body }),
    onSuccess: (_data, { workspaceId }) => invalidate(workspaceId, 'campaigns'),
  })
}

export function useCancelEvalCampaign() {
  const invalidate = useInvalidateEvaluations()
  return useMutation({
    mutationFn: ({ workspaceId, campaignId }: { workspaceId: string; campaignId: string }) =>
      requestJson(cancelEvalCampaignContract, { params: { campaignId }, body: { workspaceId } }),
    onSuccess: (_data, { workspaceId }) => invalidate(workspaceId, 'campaigns'),
  })
}

export function useDeleteEvalCampaign() {
  const invalidate = useInvalidateEvaluations()
  return useMutation({
    mutationFn: ({ workspaceId, campaignId }: { workspaceId: string; campaignId: string }) =>
      requestJson(deleteEvalCampaignContract, { params: { campaignId }, query: { workspaceId } }),
    onSuccess: (_data, { workspaceId }) => invalidate(workspaceId, 'campaigns'),
  })
}

/** Two series (`campaignId:targetKey`) compared row by row. */
export function useEvalComparison(workspaceId: string, a: string, b: string) {
  return useQuery({
    queryKey: evaluationKeys.comparison(workspaceId, a, b),
    queryFn: ({ signal }) =>
      requestJson(compareEvalCampaignsContract, { query: { workspaceId, a, b }, signal }),
    enabled: Boolean(workspaceId && a && b),
    staleTime: EVALUATIONS_STALE_TIME,
  })
}

export function useEvalSchedules(workspaceId: string) {
  return useQuery({
    queryKey: evaluationKeys.schedules(workspaceId),
    queryFn: async ({ signal }) =>
      (await requestJson(listEvalSchedulesContract, { query: { workspaceId }, signal })).schedules,
    enabled: Boolean(workspaceId),
    staleTime: EVALUATIONS_STALE_TIME,
  })
}

export function useSaveEvalSchedule() {
  const invalidate = useInvalidateEvaluations()
  return useMutation({
    mutationFn: ({ scheduleId, ...body }: NexoraEvalScheduleBody & { scheduleId?: string }) =>
      scheduleId
        ? requestJson(updateEvalScheduleContract, { params: { scheduleId }, body })
        : requestJson(createEvalScheduleContract, { body }),
    onSuccess: (_data, { workspaceId }) => invalidate(workspaceId, 'schedules'),
  })
}

export function useDeleteEvalSchedule() {
  const invalidate = useInvalidateEvaluations()
  return useMutation({
    mutationFn: ({ workspaceId, scheduleId }: { workspaceId: string; scheduleId: string }) =>
      requestJson(deleteEvalScheduleContract, { params: { scheduleId }, query: { workspaceId } }),
    onSuccess: (_data, { workspaceId }) => invalidate(workspaceId, 'schedules'),
  })
}

export function useRunEvalSchedule() {
  const invalidate = useInvalidateEvaluations()
  return useMutation({
    mutationFn: ({ workspaceId, scheduleId }: { workspaceId: string; scheduleId: string }) =>
      requestJson(runEvalScheduleContract, { params: { scheduleId }, body: { workspaceId } }),
    onSuccess: (_data, { workspaceId }) => invalidate(workspaceId, 'campaigns', 'schedules'),
  })
}

export function useEvalAlerts(workspaceId: string) {
  return useQuery({
    queryKey: evaluationKeys.alerts(workspaceId),
    queryFn: async ({ signal }) =>
      (await requestJson(listEvalAlertsContract, { query: { workspaceId }, signal })).alerts,
    enabled: Boolean(workspaceId),
    staleTime: EVALUATIONS_STALE_TIME,
    refetchInterval: 30_000,
  })
}

export function useAcknowledgeEvalAlert() {
  const invalidate = useInvalidateEvaluations()
  return useMutation({
    mutationFn: ({ workspaceId, alertId }: { workspaceId: string; alertId: string }) =>
      requestJson(acknowledgeEvalAlertContract, { params: { alertId }, body: { workspaceId } }),
    onSuccess: (_data, { workspaceId }) => invalidate(workspaceId, 'alerts'),
  })
}
