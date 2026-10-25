import { AuditAction, AuditResourceType } from '@sim/audit'
import { requirePrincipalSubjectUserId } from '@sim/auth/principal'
import { defineAuthorizedWorkspaceUseCase } from '@/lib/core/application'
import { OrchestrationError } from '@/lib/core/orchestration/types'
import { generateRequestId } from '@/lib/core/utils/request'
import {
  listConversations,
  listMessages,
  loadConversation,
} from '@/lib/nexora/assistant/repository'
import { nexoraEvaluationOperations } from '@/lib/nexora/evaluations/application/operations'
import {
  type ColumnMapping,
  DatasetImportError,
  parseCsvRows,
  parseJsonlRows,
  type RowDraft,
  rowsFromConversation,
  rowsFromRecords,
  rowsFromTraces,
} from '@/lib/nexora/evaluations/import'
import { validateJudgeConfig } from '@/lib/nexora/evaluations/judge'
import { resolveTargets, type TargetInput, targetsToInputs } from '@/lib/nexora/evaluations/launch'
import {
  abortCampaign,
  judgeLive,
  launchEvaluationCampaign,
  liveLaunchDeps,
} from '@/lib/nexora/evaluations/live'
import * as repository from '@/lib/nexora/evaluations/repository'
import { nextRunAfter, validateSchedule } from '@/lib/nexora/evaluations/schedule'
import {
  agreement,
  type ComparedRow,
  compareSeries,
  type SeriesItem,
  summarizeItems,
  type TargetSummary,
} from '@/lib/nexora/evaluations/stats'
import {
  type JudgeConfig,
  type JudgeVerdict,
  MAX_DATASET_ROWS,
} from '@/lib/nexora/evaluations/types'
import { getTraceWithSpans, listTraces } from '@/lib/nexora/traces/repository'
import { resolveTraceViewer } from '@/lib/nexora/traces/viewer'
import { canReadTrace } from '@/lib/nexora/traces/visibility'
import { getColumnId } from '@/lib/table/column-keys'
import { queryRows } from '@/lib/table/rows/service'
import { getTableById, listTables } from '@/lib/table/service'
import { resolveActiveWorkspaceApplicationContext } from '@/lib/workspaces/application/context'

const authorizationOptions = {}

interface WorkspaceInput {
  workspaceId: string
}

function resolveWorkspace({ input }: { input: WorkspaceInput }) {
  return resolveActiveWorkspaceApplicationContext(input.workspaceId)
}

function notFound(what: string): never {
  throw new OrchestrationError('not_found', `${what} introuvable`)
}

const OP = nexoraEvaluationOperations
const evaluationAudit = {
  resourceType: AuditResourceType.EVALUATION,
} as const

// ── Test sets ────────────────────────────────────────────────────────────────

export const listDatasetsUseCase = defineAuthorizedWorkspaceUseCase({
  operation: OP.listDatasets,
  resolveContext: resolveWorkspace,
  authorizationOptions,
  execute: ({ context }) => repository.listDatasets(context.workspaceId),
})

export const readDatasetUseCase = defineAuthorizedWorkspaceUseCase({
  operation: OP.readDataset,
  resolveContext: ({
    input,
  }: {
    input: WorkspaceInput & { datasetId: string; limit: number; offset: number }
  }) => resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions,
  execute: async ({ context, input }) => {
    const dataset = await repository.getDataset(context.workspaceId, input.datasetId)
    if (!dataset) notFound('Jeu de tests')
    return { dataset, rows: await repository.listRows(dataset.id, input) }
  },
})

export type DatasetSourceInput =
  | { kind: 'empty' }
  | { kind: 'csv'; text: string; mapping?: ColumnMapping }
  | { kind: 'jsonl'; text: string; mapping?: ColumnMapping }
  | { kind: 'table'; tableId: string; mapping?: ColumnMapping }
  | { kind: 'traces'; traceIds: string[] }
  | { kind: 'conversations'; conversationIds: string[] }

const TABLE_PAGE = 1000

async function rowsFromSimTable(
  workspaceId: string,
  tableId: string,
  mapping: ColumnMapping | undefined
): Promise<{ rows: RowDraft[]; skipped: number }> {
  const table = await getTableById(tableId)
  if (!table || table.workspaceId !== workspaceId) notFound('Table')
  const requestId = generateRequestId()
  const records: Record<string, unknown>[] = []
  while (records.length <= MAX_DATASET_ROWS) {
    const page = await queryRows(
      table,
      { limit: TABLE_PAGE, offset: records.length, includeTotal: false, withExecutions: false },
      requestId
    )
    for (const row of page.rows) {
      records.push(
        Object.fromEntries(
          table.schema.columns.map((column) => [
            column.name,
            row.data[getColumnId(column)] ?? row.data[column.name],
          ])
        )
      )
    }
    if (page.rows.length === 0 || page.rows.length < TABLE_PAGE) break
  }
  return rowsFromRecords(records, mapping)
}

/** Traces the person may read; a private one (Assistant, Playground…) only if it is their own. */
async function rowsFromReadableTraces(
  workspaceId: string,
  userId: string,
  traceIds: readonly string[]
): Promise<RowDraft[]> {
  const viewer = await resolveTraceViewer(userId, workspaceId)
  const readable: { id: string; input: string | null; output: string | null }[] = []
  for (const traceId of traceIds) {
    const found = await getTraceWithSpans(traceId)
    const trace = found?.trace
    if (!trace || trace.workspaceId !== workspaceId || !canReadTrace(viewer, trace as never)) {
      notFound('Trace')
    }
    if (trace.visibility === 'private' && trace.userId !== userId) notFound('Trace')
    readable.push({ id: trace.id, input: trace.inputPreview, output: trace.outputPreview })
  }
  return rowsFromTraces(readable)
}

/** The member's own Assistant conversations: another member's is not found, like a missing one. */
async function rowsFromOwnConversations(
  workspaceId: string,
  userId: string,
  conversationIds: readonly string[]
): Promise<RowDraft[]> {
  const rows: RowDraft[] = []
  for (const conversationId of conversationIds) {
    const conversation = await loadConversation(conversationId)
    if (
      !conversation ||
      conversation.userId !== userId ||
      conversation.workspaceId !== workspaceId
    ) {
      notFound('Conversation')
    }
    rows.push(...rowsFromConversation(conversation.id, await listMessages(conversation.id)))
  }
  return rows
}

async function buildRows(
  source: DatasetSourceInput,
  workspaceId: string,
  userId: string
): Promise<{ rows: RowDraft[]; skipped: number }> {
  try {
    switch (source.kind) {
      case 'empty':
        return { rows: [], skipped: 0 }
      case 'csv':
        return await parseCsvRows(source.text, source.mapping)
      case 'jsonl':
        return parseJsonlRows(source.text, source.mapping)
      case 'table':
        return await rowsFromSimTable(workspaceId, source.tableId, source.mapping)
      case 'traces':
        return {
          rows: await rowsFromReadableTraces(workspaceId, userId, source.traceIds),
          skipped: 0,
        }
      case 'conversations':
        return {
          rows: await rowsFromOwnConversations(workspaceId, userId, source.conversationIds),
          skipped: 0,
        }
    }
  } catch (error) {
    if (error instanceof DatasetImportError)
      throw new OrchestrationError('validation', error.message)
    throw error
  }
}

export const createDatasetUseCase = defineAuthorizedWorkspaceUseCase({
  operation: OP.createDataset,
  resolveContext: ({
    input,
  }: {
    input: WorkspaceInput & {
      name: string
      description: string
      source: DatasetSourceInput
    }
  }) => resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions,
  execute: async ({ context, input, principal }) => {
    const userId = requirePrincipalSubjectUserId(principal)
    const { rows, skipped } = await buildRows(input.source, context.workspaceId, userId)
    if (input.source.kind !== 'empty' && rows.length === 0) {
      throw new OrchestrationError(
        'validation',
        'Aucune ligne exploitable dans cette source : chaque ligne doit avoir une question.'
      )
    }
    const dataset = await repository.insertDataset({
      workspaceId: context.workspaceId,
      name: input.name,
      description: input.description,
      source: input.source.kind,
      createdBy: userId,
      rows,
    })
    return { dataset, skipped }
  },
  projectAudit: ({ result }) => ({
    ...evaluationAudit,
    action: AuditAction.EVALUATION_DATASET_CREATED,
    resourceId: result.dataset.id,
    resourceName: result.dataset.name,
    description: `Created test set "${result.dataset.name}"`,
    metadata: { source: result.dataset.source, rows: result.dataset.rowCount },
  }),
})

async function requireDataset(workspaceId: string, datasetId: string) {
  const dataset = await repository.getDataset(workspaceId, datasetId)
  if (!dataset) notFound('Jeu de tests')
  return dataset
}

export const appendRowsUseCase = defineAuthorizedWorkspaceUseCase({
  operation: OP.updateDataset,
  resolveContext: ({
    input,
  }: {
    input: WorkspaceInput & { datasetId: string; rows: RowDraft[] }
  }) => resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions,
  execute: async ({ context, input }) => {
    const dataset = await requireDataset(context.workspaceId, input.datasetId)
    return { added: await repository.appendRows(dataset.id, input.rows) }
  },
})

export const updateRowUseCase = defineAuthorizedWorkspaceUseCase({
  operation: OP.updateDataset,
  resolveContext: ({
    input,
  }: {
    input: WorkspaceInput & { datasetId: string; rowId: string; patch: repository.RowPatch }
  }) => resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions,
  execute: async ({ context, input }) => {
    const dataset = await requireDataset(context.workspaceId, input.datasetId)
    const row = await repository.updateRow(dataset.id, input.rowId, input.patch)
    if (!row) notFound('Ligne')
    return { row }
  },
})

export const deleteRowUseCase = defineAuthorizedWorkspaceUseCase({
  operation: OP.updateDataset,
  resolveContext: ({ input }: { input: WorkspaceInput & { datasetId: string; rowId: string } }) =>
    resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions,
  execute: async ({ context, input }) => {
    const dataset = await requireDataset(context.workspaceId, input.datasetId)
    if (!(await repository.deleteRow(dataset.id, input.rowId))) notFound('Ligne')
    return { success: true as const }
  },
})

export const deleteDatasetUseCase = defineAuthorizedWorkspaceUseCase({
  operation: OP.deleteDataset,
  resolveContext: ({ input }: { input: WorkspaceInput & { datasetId: string } }) =>
    resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions,
  execute: async ({ context, input }) => {
    const deleted = await repository.deleteDataset(context.workspaceId, input.datasetId)
    if (!deleted) notFound('Jeu de tests')
    return deleted
  },
  projectAudit: ({ result }) => ({
    ...evaluationAudit,
    action: AuditAction.EVALUATION_DATASET_DELETED,
    resourceId: result.id,
    resourceName: result.name,
    description: `Deleted test set "${result.name}"`,
  }),
})

const SOURCE_PAGE = 50

/** What a member may import from: the workspace's tables, their traces, their Assistant conversations. */
export const listImportSourcesUseCase = defineAuthorizedWorkspaceUseCase({
  operation: OP.listImportSources,
  resolveContext: resolveWorkspace,
  authorizationOptions,
  execute: async ({ context, principal }) => {
    const userId = requirePrincipalSubjectUserId(principal)
    const [tables, traces, conversations] = await Promise.all([
      listTables(context.workspaceId),
      listTraces(
        { workspaceId: context.workspaceId, limit: SOURCE_PAGE },
        { userId, seesPrivate: false }
      ),
      listConversations(context.workspaceId, userId),
    ])
    return {
      tables: tables.map((table) => ({
        id: table.id,
        name: table.name,
        rowCount: table.rowCount,
        columns: table.schema.columns.map((column) => column.name),
      })),
      traces: traces.traces
        .filter((trace) => trace.inputPreview)
        .map((trace) => ({
          id: trace.id,
          name: trace.name,
          startedAt: trace.startedAt,
          input: trace.inputPreview,
          output: trace.outputPreview,
        })),
      conversations: conversations.map((conversation) => ({
        id: conversation.id,
        title: conversation.title,
        updatedAt: conversation.updatedAt,
      })),
    }
  },
})

// ── Judges ───────────────────────────────────────────────────────────────────

export const listJudgesUseCase = defineAuthorizedWorkspaceUseCase({
  operation: OP.listJudges,
  resolveContext: resolveWorkspace,
  authorizationOptions,
  execute: ({ context }) => repository.listJudges(context.workspaceId),
})

function requireValidJudge(config: JudgeConfig): void {
  const problem = validateJudgeConfig(config)
  if (problem) throw new OrchestrationError('validation', problem)
}

export const saveJudgeUseCase = defineAuthorizedWorkspaceUseCase({
  operation: OP.saveJudge,
  resolveContext: ({
    input,
  }: {
    input: WorkspaceInput & { judgeId?: string; name: string; config: JudgeConfig }
  }) => resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions,
  execute: async ({ context, input, principal }) => {
    requireValidJudge(input.config)
    return repository.saveJudge({
      id: input.judgeId,
      workspaceId: context.workspaceId,
      name: input.name,
      config: input.config,
      createdBy: requirePrincipalSubjectUserId(principal),
    })
  },
  projectAudit: ({ result }) => ({
    ...evaluationAudit,
    action: AuditAction.EVALUATION_JUDGE_SAVED,
    resourceId: result.id,
    resourceName: result.name,
    description: `Saved judge "${result.name}"`,
    metadata: { kind: result.kind },
  }),
})

export const deleteJudgeUseCase = defineAuthorizedWorkspaceUseCase({
  operation: OP.deleteJudge,
  resolveContext: ({ input }: { input: WorkspaceInput & { judgeId: string } }) =>
    resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions,
  execute: async ({ context, input }) => {
    const deleted = await repository.deleteJudge(context.workspaceId, input.judgeId)
    if (!deleted) notFound('Juge')
    return deleted
  },
  projectAudit: ({ result }) => ({
    ...evaluationAudit,
    action: AuditAction.EVALUATION_JUDGE_DELETED,
    resourceId: result.id,
    resourceName: result.name,
    description: `Deleted judge "${result.name}"`,
  }),
})

const TRY_CONCURRENCY = 3

/** Rows a judge is tried on: the annotated ones first, then the ones that carry an answer. */
export function rowsToTry(rows: readonly repository.RowRecord[], limit: number) {
  const usable = rows.filter((row) => row.candidate?.trim() || row.expected?.trim())
  const annotated = usable.filter((row) => row.humanVerdict !== null)
  const others = usable.filter((row) => row.humanVerdict === null)
  return [...annotated, ...others].slice(0, limit)
}

/** « Essayer » : the judge on up to 10 rows of a test set, with its agreement with the human verdicts. */
export const tryJudgeUseCase = defineAuthorizedWorkspaceUseCase({
  operation: OP.tryJudge,
  resolveContext: ({
    input,
  }: {
    input: WorkspaceInput & { config: JudgeConfig; datasetId: string; limit: number }
  }) => resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions,
  execute: async ({ context, input, principal }) => {
    requireValidJudge(input.config)
    const dataset = await requireDataset(context.workspaceId, input.datasetId)
    const chosen = rowsToTry(
      await repository.listRows(dataset.id, { limit: MAX_DATASET_ROWS, offset: 0 }),
      input.limit
    )
    if (chosen.length === 0) {
      throw new OrchestrationError(
        'validation',
        'Ce jeu de tests n’a aucune ligne avec une réponse (annotée ou attendue) à juger.'
      )
    }
    const userId = requirePrincipalSubjectUserId(principal)
    const controller = new AbortController()
    const results = new Array<Awaited<ReturnType<typeof judgeOne>>>(chosen.length)
    const judgeOne = async (row: repository.RowRecord) => {
      const usedExpected = !row.candidate?.trim()
      const answer = (usedExpected ? row.expected : row.candidate) ?? ''
      const run = await judgeLive(
        input.config,
        { input: row.input, answer, expected: row.expected, guidance: row.guidance },
        {
          workspaceId: context.workspaceId,
          userId,
          campaignName: `essai du juge sur « ${dataset.name} »`,
          signal: controller.signal,
        }
      )
      return {
        rowId: row.id,
        input: row.input,
        answer,
        usedExpected,
        humanVerdict: row.humanVerdict,
        humanNote: row.humanNote,
        verdict: run.verdict,
        score: run.score,
        note: run.note,
      }
    }
    let next = 0
    await Promise.all(
      Array.from({ length: Math.min(TRY_CONCURRENCY, chosen.length) }, async () => {
        while (next < chosen.length) {
          const index = next++
          results[index] = await judgeOne(chosen[index])
        }
      })
    )
    const pairs = results.flatMap((result) =>
      result.humanVerdict && !result.usedExpected
        ? [{ judge: result.verdict, human: result.humanVerdict }]
        : []
    )
    return { results, agreement: agreement(pairs) }
  },
})

// ── Campaigns ────────────────────────────────────────────────────────────────

export const listCampaignsUseCase = defineAuthorizedWorkspaceUseCase({
  operation: OP.listCampaigns,
  resolveContext: resolveWorkspace,
  authorizationOptions,
  execute: ({ context }) => repository.listCampaigns(context.workspaceId, 100),
})

const ANSWER_PREVIEW = 1_500

function groupByTarget<T extends { targetKey: string }>(items: readonly T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>()
  for (const item of items) {
    const list = grouped.get(item.targetKey) ?? []
    list.push(item)
    grouped.set(item.targetKey, list)
  }
  return grouped
}

export const readCampaignUseCase = defineAuthorizedWorkspaceUseCase({
  operation: OP.readCampaign,
  resolveContext: ({ input }: { input: WorkspaceInput & { campaignId: string } }) =>
    resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions,
  execute: async ({ context, input }) => {
    const campaign = await repository.getCampaign(context.workspaceId, input.campaignId)
    if (!campaign) notFound('Campagne')
    const [items, dataset, judge] = await Promise.all([
      repository.listItems(campaign.id, { answerPreview: ANSWER_PREVIEW }),
      repository.getDataset(context.workspaceId, campaign.datasetId),
      repository.getJudge(context.workspaceId, campaign.judgeId),
    ])
    const summaries = [...groupByTarget(items)].map(([targetKey, targetItems]) => ({
      targetKey,
      summary: summarizeItems(targetItems),
    }))
    return {
      campaign,
      datasetName: dataset?.name ?? null,
      judgeName: judge?.name ?? null,
      summaries,
      items,
    }
  },
})

export const launchCampaignUseCase = defineAuthorizedWorkspaceUseCase({
  operation: OP.launchCampaign,
  resolveContext: ({
    input,
  }: {
    input: WorkspaceInput & {
      name: string
      datasetId: string
      judgeId: string
      targets: TargetInput[]
      concurrency: number
      alertThreshold?: number | null
    }
  }) => resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions,
  execute: ({ context, input, principal }) =>
    launchEvaluationCampaign({
      ...input,
      workspaceId: context.workspaceId,
      createdBy: requirePrincipalSubjectUserId(principal),
    }),
  projectAudit: ({ result }) => ({
    ...evaluationAudit,
    action: AuditAction.EVALUATION_CAMPAIGN_LAUNCHED,
    resourceId: result.id,
    resourceName: result.name,
    description: `Launched evaluation campaign "${result.name}"`,
    metadata: { items: result.itemTotal, targets: result.targets.map((target) => target.label) },
  }),
})

export const cancelCampaignUseCase = defineAuthorizedWorkspaceUseCase({
  operation: OP.cancelCampaign,
  resolveContext: ({ input }: { input: WorkspaceInput & { campaignId: string } }) =>
    resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions,
  execute: async ({ context, input }) => {
    const cancelled = await repository.cancelCampaign(context.workspaceId, input.campaignId)
    if (!cancelled) {
      const existing = await repository.getCampaign(context.workspaceId, input.campaignId)
      if (!existing) notFound('Campagne')
      throw new OrchestrationError('conflict', 'Cette campagne est déjà terminée.')
    }
    abortCampaign(cancelled.id)
    return cancelled
  },
  projectAudit: ({ result }) => ({
    ...evaluationAudit,
    action: AuditAction.EVALUATION_CAMPAIGN_CANCELLED,
    resourceId: result.id,
    resourceName: result.name,
    description: `Cancelled evaluation campaign "${result.name}"`,
  }),
})

export const deleteCampaignUseCase = defineAuthorizedWorkspaceUseCase({
  operation: OP.deleteCampaign,
  resolveContext: ({ input }: { input: WorkspaceInput & { campaignId: string } }) =>
    resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions,
  execute: async ({ context, input }) => {
    const deleted = await repository.deleteCampaign(context.workspaceId, input.campaignId)
    if (!deleted) notFound('Campagne')
    return deleted
  },
  projectAudit: ({ result }) => ({
    ...evaluationAudit,
    action: AuditAction.EVALUATION_CAMPAIGN_DELETED,
    resourceId: result.id,
    resourceName: result.name,
    description: `Deleted evaluation campaign "${result.name}"`,
  }),
})

/** `campaignId:targetKey`, as the comparison page writes it in the address. */
export function parseSeriesRef(ref: string): { campaignId: string; targetKey: string } {
  const separator = ref.lastIndexOf(':')
  if (separator <= 0 || separator === ref.length - 1) {
    throw new OrchestrationError('validation', 'Référence de série invalide (campagne:cible).')
  }
  return { campaignId: ref.slice(0, separator), targetKey: ref.slice(separator + 1) }
}

async function loadSeries(workspaceId: string, ref: string) {
  const { campaignId, targetKey } = parseSeriesRef(ref)
  const campaign = await repository.getCampaign(workspaceId, campaignId)
  const target = campaign?.targets.find((candidate) => candidate.key === targetKey)
  if (!campaign || !target) notFound('Série')
  const items = (await repository.listItems(campaign.id, { answerPreview: ANSWER_PREVIEW })).filter(
    (item) => item.targetKey === targetKey
  )
  const series: SeriesItem[] = items.map((item) => ({
    rowId: item.rowId,
    input: item.input,
    answer: item.answer,
    verdict: item.verdict as JudgeVerdict | null,
    score: item.score,
    latencyMs: item.latencyMs,
  }))
  return {
    series,
    side: {
      campaignId: campaign.id,
      campaignName: campaign.name,
      targetKey,
      targetLabel: target.label,
      summary: summarizeItems(items),
    },
  }
}

/** Two series (a campaign's target each, possibly of the same campaign) compared row by row. */
export const compareCampaignsUseCase = defineAuthorizedWorkspaceUseCase({
  operation: OP.compareCampaigns,
  resolveContext: ({ input }: { input: WorkspaceInput & { a: string; b: string } }) =>
    resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions,
  execute: async ({ context, input }) => {
    const [a, b] = await Promise.all([
      loadSeries(context.workspaceId, input.a),
      loadSeries(context.workspaceId, input.b),
    ])
    const { rows, counts } = compareSeries(a.series, b.series)
    return { a: a.side, b: b.side, rows: rows.map(presentComparedRow), counts }
  },
})

function presentComparedRow(row: ComparedRow) {
  const side = (item: SeriesItem | null) =>
    item
      ? { answer: item.answer, verdict: item.verdict, score: item.score, latencyMs: item.latencyMs }
      : null
  return { rowId: row.rowId, input: row.input, change: row.change, a: side(row.a), b: side(row.b) }
}

// ── Schedules ────────────────────────────────────────────────────────────────

export const listSchedulesUseCase = defineAuthorizedWorkspaceUseCase({
  operation: OP.listSchedules,
  resolveContext: resolveWorkspace,
  authorizationOptions,
  execute: ({ context }) => repository.listSchedules(context.workspaceId),
})

interface ScheduleInput extends WorkspaceInput {
  scheduleId?: string
  name: string
  cron: string
  timezone: string
  datasetId: string
  judgeId: string
  targets: TargetInput[]
  concurrency: number
  alertThreshold?: number | null
  enabled: boolean
}

export const saveScheduleUseCase = defineAuthorizedWorkspaceUseCase({
  operation: OP.saveSchedule,
  resolveContext: ({ input }: { input: ScheduleInput }) =>
    resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions,
  execute: async ({ context, input, principal }) => {
    const problem = validateSchedule(input.cron, input.timezone)
    if (problem) throw new OrchestrationError('validation', problem)
    const [dataset, judge] = await Promise.all([
      repository.getDataset(context.workspaceId, input.datasetId),
      repository.getJudge(context.workspaceId, input.judgeId),
    ])
    if (!dataset) notFound('Jeu de tests')
    if (!judge) notFound('Juge')
    const targets = await resolveTargets(context.workspaceId, input.targets, liveLaunchDeps)
    const values = {
      name: input.name,
      cron: input.cron,
      timezone: input.timezone,
      datasetId: dataset.id,
      judgeId: judge.id,
      targets,
      concurrency: input.concurrency,
      alertThreshold: input.alertThreshold ?? null,
      enabled: input.enabled,
      nextRunAt: input.enabled ? nextRunAfter(input.cron, input.timezone, new Date()) : null,
    }
    if (input.scheduleId) {
      const updated = await repository.updateSchedule(context.workspaceId, input.scheduleId, values)
      if (!updated) notFound('Planification')
      return updated
    }
    return repository.insertSchedule({
      ...values,
      workspaceId: context.workspaceId,
      createdBy: requirePrincipalSubjectUserId(principal),
    })
  },
  projectAudit: ({ result }) => ({
    ...evaluationAudit,
    action: AuditAction.EVALUATION_SCHEDULE_SAVED,
    resourceId: result.id,
    resourceName: result.name,
    description: `Saved scheduled evaluation "${result.name}"`,
    metadata: { cron: result.cron, timezone: result.timezone, enabled: result.enabled },
  }),
})

export const deleteScheduleUseCase = defineAuthorizedWorkspaceUseCase({
  operation: OP.deleteSchedule,
  resolveContext: ({ input }: { input: WorkspaceInput & { scheduleId: string } }) =>
    resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions,
  execute: async ({ context, input }) => {
    const deleted = await repository.deleteSchedule(context.workspaceId, input.scheduleId)
    if (!deleted) notFound('Planification')
    return deleted
  },
  projectAudit: ({ result }) => ({
    ...evaluationAudit,
    action: AuditAction.EVALUATION_SCHEDULE_DELETED,
    resourceId: result.id,
    resourceName: result.name,
    description: `Deleted scheduled evaluation "${result.name}"`,
  }),
})

/** Runs a schedule's campaign now, without moving its timetable. */
export const runScheduleUseCase = defineAuthorizedWorkspaceUseCase({
  operation: OP.runSchedule,
  resolveContext: ({ input }: { input: WorkspaceInput & { scheduleId: string } }) =>
    resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions,
  execute: async ({ context, input, principal }) => {
    const schedule = await repository.getSchedule(context.workspaceId, input.scheduleId)
    if (!schedule) notFound('Planification')
    const campaign = await launchEvaluationCampaign({
      workspaceId: schedule.workspaceId,
      name: `${schedule.name} · lancement manuel`,
      datasetId: schedule.datasetId,
      judgeId: schedule.judgeId,
      targets: targetsToInputs(schedule.targets),
      concurrency: schedule.concurrency,
      alertThreshold: schedule.alertThreshold,
      scheduleId: schedule.id,
      createdBy: requirePrincipalSubjectUserId(principal),
    })
    await repository.setScheduleLastCampaign(schedule.id, campaign.id)
    return campaign
  },
  projectAudit: ({ result }) => ({
    ...evaluationAudit,
    action: AuditAction.EVALUATION_CAMPAIGN_LAUNCHED,
    resourceId: result.id,
    resourceName: result.name,
    description: `Launched evaluation campaign "${result.name}"`,
    metadata: { items: result.itemTotal, scheduleId: result.scheduleId },
  }),
})

// ── Alerts ───────────────────────────────────────────────────────────────────

export const listAlertsUseCase = defineAuthorizedWorkspaceUseCase({
  operation: OP.listAlerts,
  resolveContext: resolveWorkspace,
  authorizationOptions,
  execute: ({ context }) => repository.listAlerts(context.workspaceId, { open: true }),
})

export const acknowledgeAlertUseCase = defineAuthorizedWorkspaceUseCase({
  operation: OP.acknowledgeAlert,
  resolveContext: ({ input }: { input: WorkspaceInput & { alertId: string } }) =>
    resolveActiveWorkspaceApplicationContext(input.workspaceId),
  authorizationOptions,
  execute: async ({ context, input, principal }) => {
    const done = await repository.acknowledgeAlert(
      context.workspaceId,
      input.alertId,
      requirePrincipalSubjectUserId(principal)
    )
    if (!done) notFound('Alerte')
    return { alertId: input.alertId }
  },
  projectAudit: ({ result }) => ({
    ...evaluationAudit,
    action: AuditAction.EVALUATION_ALERT_ACKNOWLEDGED,
    resourceId: result.alertId,
    description: 'Acknowledged evaluation alert',
  }),
})

export type { TargetSummary }
