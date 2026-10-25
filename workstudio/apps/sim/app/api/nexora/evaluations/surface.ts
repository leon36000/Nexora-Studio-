import type {
  NexoraEvalAlert,
  NexoraEvalCampaign,
  NexoraEvalCampaignListEntry,
  NexoraEvalDataset,
  NexoraEvalItem,
  NexoraEvalJudge,
  NexoraEvalRow,
  NexoraEvalRowInput,
  NexoraEvalSchedule,
} from '@/lib/api/contracts/nexora-evaluations'
import type { RowDraft } from '@/lib/nexora/evaluations/import'
import type {
  AlertRecord,
  CampaignProgress,
  CampaignRecord,
  DatasetRecord,
  ItemRecord,
  JudgeRecord,
  RowRecord,
  ScheduleRecord,
} from '@/lib/nexora/evaluations/repository'

export function presentDataset(dataset: DatasetRecord): NexoraEvalDataset {
  return {
    id: dataset.id,
    name: dataset.name,
    description: dataset.description,
    source: dataset.source,
    rowCount: dataset.rowCount,
    annotatedCount: dataset.annotatedCount,
    createdAt: dataset.createdAt.toISOString(),
    updatedAt: dataset.updatedAt.toISOString(),
  }
}

export function presentRow(row: RowRecord): NexoraEvalRow {
  return {
    id: row.id,
    position: row.position,
    input: row.input,
    expected: row.expected,
    guidance: row.guidance,
    candidate: row.candidate,
    humanVerdict: row.humanVerdict,
    humanNote: row.humanNote,
    sourceRef: row.sourceRef,
  }
}

/** A row as a person typed it: empty optional fields become `null`. */
export function toRowDraft(row: NexoraEvalRowInput): RowDraft {
  return {
    input: row.input,
    expected: row.expected?.trim() || null,
    guidance: row.guidance?.trim() || null,
    candidate: row.candidate?.trim() || null,
    humanVerdict: row.humanVerdict ?? null,
    humanNote: row.humanNote?.trim() || null,
    sourceRef: null,
  }
}

export function presentJudge(judge: JudgeRecord): NexoraEvalJudge {
  return {
    id: judge.id,
    name: judge.name,
    kind: judge.kind,
    config: judge.config,
    createdAt: judge.createdAt.toISOString(),
    updatedAt: judge.updatedAt.toISOString(),
  }
}

export function presentCampaign(campaign: CampaignRecord): NexoraEvalCampaign {
  return {
    id: campaign.id,
    name: campaign.name,
    datasetId: campaign.datasetId,
    judgeId: campaign.judgeId,
    targets: campaign.targets.map(({ key, label, kind }) => ({ key, label, kind })),
    concurrency: campaign.concurrency,
    alertThreshold: campaign.alertThreshold,
    status: campaign.status,
    error: campaign.error,
    scheduleId: campaign.scheduleId,
    itemTotal: campaign.itemTotal,
    createdAt: campaign.createdAt.toISOString(),
    startedAt: campaign.startedAt?.toISOString() ?? null,
    finishedAt: campaign.finishedAt?.toISOString() ?? null,
  }
}

export function presentCampaignListEntry(
  campaign: CampaignRecord & { progress: CampaignProgress }
): NexoraEvalCampaignListEntry {
  return { ...presentCampaign(campaign), progress: campaign.progress }
}

export function presentItem(item: ItemRecord): NexoraEvalItem {
  return {
    id: item.id,
    rowId: item.rowId,
    targetKey: item.targetKey,
    position: item.position,
    status: item.status,
    input: item.input,
    expected: item.expected,
    answer: item.answer,
    verdict: item.verdict,
    score: item.score,
    judgeNote: item.judgeNote,
    error: item.error,
    latencyMs: item.latencyMs,
  }
}

export function presentSchedule(schedule: ScheduleRecord): NexoraEvalSchedule {
  return {
    id: schedule.id,
    name: schedule.name,
    cron: schedule.cron,
    timezone: schedule.timezone,
    datasetId: schedule.datasetId,
    judgeId: schedule.judgeId,
    targets: schedule.targets.map(({ key, label, kind }) => ({ key, label, kind })),
    concurrency: schedule.concurrency,
    alertThreshold: schedule.alertThreshold,
    enabled: schedule.enabled,
    nextRunAt: schedule.nextRunAt?.toISOString() ?? null,
    lastRunAt: schedule.lastRunAt?.toISOString() ?? null,
    lastCampaignId: schedule.lastCampaignId,
  }
}

export function presentAlert(alert: AlertRecord): NexoraEvalAlert {
  return {
    id: alert.id,
    campaignId: alert.campaignId,
    campaignName: alert.campaignName,
    targetKey: alert.targetKey,
    targetLabel: alert.targetLabel,
    kind: alert.kind,
    passRate: alert.passRate,
    threshold: alert.threshold,
    createdAt: alert.createdAt.toISOString(),
    acknowledgedAt: alert.acknowledgedAt?.toISOString() ?? null,
  }
}
