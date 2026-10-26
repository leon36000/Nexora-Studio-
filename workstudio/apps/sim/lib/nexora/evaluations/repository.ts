import { db } from '@sim/db'
import {
  nexoraEvalAlert,
  nexoraEvalCampaign,
  nexoraEvalDataset,
  nexoraEvalItem,
  nexoraEvalJudge,
  nexoraEvalRow,
  nexoraEvalSchedule,
} from '@sim/db/schema'
import { getPostgresConstraintName, getPostgresErrorCode } from '@sim/utils/errors'
import { generateId } from '@sim/utils/id'
import { isRecordLike } from '@sim/utils/object'
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  sql,
} from 'drizzle-orm'
import { OrchestrationError } from '@/lib/core/orchestration/types'
import type { RowDraft } from '@/lib/nexora/evaluations/import'
import {
  type CampaignStatus,
  type EvalTarget,
  type ItemStatus,
  type JudgeConfig,
  type JudgeKind,
  type JudgeVerdict,
  MAX_DATASET_ROWS,
} from '@/lib/nexora/evaluations/types'

/** An item interrupted this many times (the server stopped while it ran) is given up on. */
const MAX_ITEM_ATTEMPTS = 3

const INSERT_CHUNK = 500

const DATASET_NAME_INDEX = 'nexora_eval_dataset_workspace_name_idx'
const JUDGE_NAME_INDEX = 'nexora_eval_judge_workspace_name_idx'

function isUniqueViolation(error: unknown, index: string): boolean {
  return getPostgresErrorCode(error) === '23505' && getPostgresConstraintName(error) === index
}

function isReferenceViolation(error: unknown): boolean {
  return getPostgresErrorCode(error) === '23503'
}

const JUDGE_KINDS: readonly JudgeKind[] = [
  'contains',
  'regex',
  'json_valid',
  'llm_class',
  'llm_score',
  'semantic',
]

/** The judge settings as stored: written by this module's callers after validation. */
function asJudgeConfig(value: unknown): JudgeConfig {
  if (isRecordLike(value) && JUDGE_KINDS.some((kind) => kind === value.kind)) {
    // double-cast-allowed: the settings were validated by the contract before they were stored
    return value as unknown as JudgeConfig
  }
  throw new Error('Stored judge settings are unreadable')
}

function asTargets(value: unknown): EvalTarget[] {
  if (!Array.isArray(value)) return []
  // double-cast-allowed: the targets were validated by the contract before they were stored
  return value.filter(isRecordLike) as unknown as EvalTarget[]
}

function asHumanVerdict(value: string | null): 'pass' | 'fail' | null {
  return value === 'pass' || value === 'fail' ? value : null
}

export interface DatasetRecord {
  id: string
  workspaceId: string
  name: string
  description: string
  source: string
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
  rowCount: number
  /** Rows a person annotated (an answer and a verdict): what a judge is calibrated against. */
  annotatedCount: number
}

export interface RowRecord {
  id: string
  datasetId: string
  position: number
  input: string
  expected: string | null
  guidance: string | null
  candidate: string | null
  humanVerdict: 'pass' | 'fail' | null
  humanNote: string | null
  sourceRef: string | null
}

/** Correlated counts: the columns are written out because a bare reference would bind to the inner table. */
const datasetCounts = {
  rowCount: sql<number>`(SELECT count(*)::int FROM nexora_eval_row r WHERE r.dataset_id = nexora_eval_dataset.id)`,
  annotatedCount: sql<number>`(SELECT count(*)::int FROM nexora_eval_row r WHERE r.dataset_id = nexora_eval_dataset.id AND r.human_verdict IS NOT NULL)`,
}

const datasetColumns = {
  id: nexoraEvalDataset.id,
  workspaceId: nexoraEvalDataset.workspaceId,
  name: nexoraEvalDataset.name,
  description: nexoraEvalDataset.description,
  source: nexoraEvalDataset.source,
  createdBy: nexoraEvalDataset.createdBy,
  createdAt: nexoraEvalDataset.createdAt,
  updatedAt: nexoraEvalDataset.updatedAt,
  ...datasetCounts,
}

const rowColumns = {
  id: nexoraEvalRow.id,
  datasetId: nexoraEvalRow.datasetId,
  position: nexoraEvalRow.position,
  input: nexoraEvalRow.input,
  expected: nexoraEvalRow.expected,
  guidance: nexoraEvalRow.guidance,
  candidate: nexoraEvalRow.candidate,
  humanVerdict: nexoraEvalRow.humanVerdict,
  humanNote: nexoraEvalRow.humanNote,
  sourceRef: nexoraEvalRow.sourceRef,
}

function toRow(row: Omit<RowRecord, 'humanVerdict'> & { humanVerdict: string | null }): RowRecord {
  return { ...row, humanVerdict: asHumanVerdict(row.humanVerdict) }
}

function rowValues(datasetId: string, rows: readonly RowDraft[], firstPosition: number) {
  return rows.map((row, index) => ({
    id: generateId(),
    datasetId,
    position: firstPosition + index,
    input: row.input,
    expected: row.expected,
    guidance: row.guidance,
    candidate: row.candidate,
    humanVerdict: row.humanVerdict,
    humanNote: row.humanNote,
    sourceRef: row.sourceRef,
  }))
}

export async function insertDataset(input: {
  workspaceId: string
  name: string
  description: string
  source: string
  createdBy: string | null
  rows: readonly RowDraft[]
}): Promise<DatasetRecord> {
  if (input.rows.length > MAX_DATASET_ROWS) {
    throw new OrchestrationError(
      'validation',
      `Un jeu de tests contient au plus ${MAX_DATASET_ROWS} lignes.`
    )
  }
  const id = generateId()
  try {
    await db.transaction(async (tx) => {
      await tx.insert(nexoraEvalDataset).values({
        id,
        workspaceId: input.workspaceId,
        name: input.name,
        description: input.description,
        source: input.source,
        createdBy: input.createdBy,
      })
      const values = rowValues(id, input.rows, 0)
      for (let start = 0; start < values.length; start += INSERT_CHUNK) {
        await tx.insert(nexoraEvalRow).values(values.slice(start, start + INSERT_CHUNK))
      }
    })
  } catch (error) {
    if (isUniqueViolation(error, DATASET_NAME_INDEX)) {
      throw new OrchestrationError(
        'conflict',
        `Un jeu de tests nommé « ${input.name} » existe déjà dans cet espace.`
      )
    }
    throw error
  }
  const created = await getDataset(input.workspaceId, id)
  if (!created) throw new Error('Test set vanished after insert')
  return created
}

export async function getDataset(
  workspaceId: string,
  datasetId: string
): Promise<DatasetRecord | null> {
  const [row] = await db
    .select(datasetColumns)
    .from(nexoraEvalDataset)
    .where(and(eq(nexoraEvalDataset.id, datasetId), eq(nexoraEvalDataset.workspaceId, workspaceId)))
    .limit(1)
  return row ?? null
}

export async function listDatasets(workspaceId: string): Promise<DatasetRecord[]> {
  return db
    .select(datasetColumns)
    .from(nexoraEvalDataset)
    .where(eq(nexoraEvalDataset.workspaceId, workspaceId))
    .orderBy(desc(nexoraEvalDataset.updatedAt), asc(nexoraEvalDataset.name))
    .limit(200)
}

export async function listRows(
  datasetId: string,
  page: { limit: number; offset: number }
): Promise<RowRecord[]> {
  const rows = await db
    .select(rowColumns)
    .from(nexoraEvalRow)
    .where(eq(nexoraEvalRow.datasetId, datasetId))
    .orderBy(asc(nexoraEvalRow.position))
    .limit(page.limit)
    .offset(page.offset)
  return rows.map(toRow)
}

/** Adds rows after the last one; refuses to go past `maxRows` in all. Returns how many were added. */
export async function appendRows(
  datasetId: string,
  rows: readonly RowDraft[],
  { maxRows = MAX_DATASET_ROWS }: { maxRows?: number } = {}
): Promise<number> {
  if (rows.length === 0) return 0
  await db.transaction(async (tx) => {
    // Serializes concurrent appends to one test set so positions stay consecutive.
    await tx
      .select({ id: nexoraEvalDataset.id })
      .from(nexoraEvalDataset)
      .where(eq(nexoraEvalDataset.id, datasetId))
      .for('update')
    const [{ total }] = await tx
      .select({ total: count() })
      .from(nexoraEvalRow)
      .where(eq(nexoraEvalRow.datasetId, datasetId))
    if (total + rows.length > maxRows) {
      throw new OrchestrationError(
        'validation',
        `Un jeu de tests contient au plus ${maxRows} lignes (il en a déjà ${total}).`
      )
    }
    const values = rowValues(datasetId, rows, total)
    for (let start = 0; start < values.length; start += INSERT_CHUNK) {
      await tx.insert(nexoraEvalRow).values(values.slice(start, start + INSERT_CHUNK))
    }
    await tx
      .update(nexoraEvalDataset)
      .set({ updatedAt: new Date() })
      .where(eq(nexoraEvalDataset.id, datasetId))
  })
  return rows.length
}

export interface RowPatch {
  input?: string
  expected?: string | null
  guidance?: string | null
  candidate?: string | null
  humanVerdict?: 'pass' | 'fail' | null
  humanNote?: string | null
}

export async function updateRow(
  datasetId: string,
  rowId: string,
  patch: RowPatch
): Promise<RowRecord | null> {
  if (Object.keys(patch).length === 0) return null
  const [updated] = await db
    .update(nexoraEvalRow)
    .set(patch)
    .where(and(eq(nexoraEvalRow.id, rowId), eq(nexoraEvalRow.datasetId, datasetId)))
    .returning(rowColumns)
  if (!updated) return null
  await db
    .update(nexoraEvalDataset)
    .set({ updatedAt: new Date() })
    .where(eq(nexoraEvalDataset.id, datasetId))
  return toRow(updated)
}

export async function deleteRow(datasetId: string, rowId: string): Promise<boolean> {
  const deleted = await db
    .delete(nexoraEvalRow)
    .where(and(eq(nexoraEvalRow.id, rowId), eq(nexoraEvalRow.datasetId, datasetId)))
    .returning({ id: nexoraEvalRow.id })
  return deleted.length > 0
}

export async function deleteDataset(
  workspaceId: string,
  datasetId: string
): Promise<{ id: string; name: string } | null> {
  try {
    const [deleted] = await db
      .delete(nexoraEvalDataset)
      .where(
        and(eq(nexoraEvalDataset.id, datasetId), eq(nexoraEvalDataset.workspaceId, workspaceId))
      )
      .returning({ id: nexoraEvalDataset.id, name: nexoraEvalDataset.name })
    return deleted ?? null
  } catch (error) {
    if (isReferenceViolation(error)) {
      throw new OrchestrationError(
        'conflict',
        'Ce jeu de tests est utilisé par une campagne ou une planification : supprimez-les d’abord.'
      )
    }
    throw error
  }
}

export interface JudgeRecord {
  id: string
  workspaceId: string
  name: string
  kind: JudgeKind
  config: JudgeConfig
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
}

type JudgeRow = typeof nexoraEvalJudge.$inferSelect

function toJudge(row: JudgeRow): JudgeRecord {
  const config = asJudgeConfig(row.config)
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    kind: config.kind,
    config,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/** Creates a judge, or replaces the settings and name of the one `id` designates. */
export async function saveJudge(input: {
  id?: string
  workspaceId: string
  name: string
  config: JudgeConfig
  createdBy: string | null
}): Promise<JudgeRecord> {
  try {
    if (input.id) {
      const [updated] = await db
        .update(nexoraEvalJudge)
        .set({
          name: input.name,
          kind: input.config.kind,
          config: input.config,
          updatedAt: new Date(),
        })
        .where(
          and(eq(nexoraEvalJudge.id, input.id), eq(nexoraEvalJudge.workspaceId, input.workspaceId))
        )
        .returning()
      if (!updated) throw new OrchestrationError('not_found', 'Juge introuvable')
      return toJudge(updated)
    }
    const [created] = await db
      .insert(nexoraEvalJudge)
      .values({
        id: generateId(),
        workspaceId: input.workspaceId,
        name: input.name,
        kind: input.config.kind,
        config: input.config,
        createdBy: input.createdBy,
      })
      .returning()
    return toJudge(created)
  } catch (error) {
    if (isUniqueViolation(error, JUDGE_NAME_INDEX)) {
      throw new OrchestrationError(
        'conflict',
        `Un juge nommé « ${input.name} » existe déjà dans cet espace.`
      )
    }
    throw error
  }
}

export async function getJudge(workspaceId: string, judgeId: string): Promise<JudgeRecord | null> {
  const [row] = await db
    .select()
    .from(nexoraEvalJudge)
    .where(and(eq(nexoraEvalJudge.id, judgeId), eq(nexoraEvalJudge.workspaceId, workspaceId)))
    .limit(1)
  return row ? toJudge(row) : null
}

export async function listJudges(workspaceId: string): Promise<JudgeRecord[]> {
  const rows = await db
    .select()
    .from(nexoraEvalJudge)
    .where(eq(nexoraEvalJudge.workspaceId, workspaceId))
    .orderBy(asc(nexoraEvalJudge.name))
    .limit(200)
  return rows.map(toJudge)
}

export async function deleteJudge(
  workspaceId: string,
  judgeId: string
): Promise<{ id: string; name: string } | null> {
  try {
    const [deleted] = await db
      .delete(nexoraEvalJudge)
      .where(and(eq(nexoraEvalJudge.id, judgeId), eq(nexoraEvalJudge.workspaceId, workspaceId)))
      .returning({ id: nexoraEvalJudge.id, name: nexoraEvalJudge.name })
    return deleted ?? null
  } catch (error) {
    if (isReferenceViolation(error)) {
      throw new OrchestrationError(
        'conflict',
        'Ce juge est utilisé par une campagne ou une planification : supprimez-les d’abord.'
      )
    }
    throw error
  }
}

export interface CampaignRecord {
  id: string
  workspaceId: string
  name: string
  datasetId: string
  judgeId: string
  targets: EvalTarget[]
  concurrency: number
  alertThreshold: number | null
  status: CampaignStatus
  error: string | null
  scheduleId: string | null
  itemTotal: number
  createdBy: string | null
  createdAt: Date
  startedAt: Date | null
  finishedAt: Date | null
}

export interface CampaignProgress {
  finished: number
  passed: number
  errors: number
}

type CampaignRow = typeof nexoraEvalCampaign.$inferSelect

const CAMPAIGN_STATUSES: readonly CampaignStatus[] = [
  'pending',
  'running',
  'completed',
  'cancelled',
  'interrupted',
  'failed',
]

function toCampaign(row: CampaignRow): CampaignRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    datasetId: row.datasetId,
    judgeId: row.judgeId,
    targets: asTargets(row.targets),
    concurrency: row.concurrency,
    alertThreshold: row.alertThreshold,
    status: CAMPAIGN_STATUSES.find((status) => status === row.status) ?? 'failed',
    error: row.error,
    scheduleId: row.scheduleId,
    itemTotal: row.itemTotal,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
  }
}

/**
 * Creates a campaign and its items, one per row and target (row by row, so a partly done
 * campaign has answered the first rows for every target). The items hold their own copy of the
 * row: editing or deleting the test set afterwards changes nothing here.
 */
export async function insertCampaignWithItems(input: {
  workspaceId: string
  name: string
  datasetId: string
  judgeId: string
  targets: EvalTarget[]
  concurrency: number
  alertThreshold: number | null
  scheduleId: string | null
  createdBy: string | null
  rows: readonly RowRecord[]
}): Promise<CampaignRecord> {
  const id = generateId()
  const itemTotal = input.rows.length * input.targets.length
  const items = input.rows.flatMap((row, rowIndex) =>
    input.targets.map((target, targetIndex) => ({
      id: generateId(),
      campaignId: id,
      rowId: row.id,
      targetKey: target.key,
      position: rowIndex * input.targets.length + targetIndex,
      input: row.input,
      expected: row.expected,
      guidance: row.guidance,
    }))
  )
  const created = await db.transaction(async (tx) => {
    const [campaign] = await tx
      .insert(nexoraEvalCampaign)
      .values({
        id,
        workspaceId: input.workspaceId,
        name: input.name,
        datasetId: input.datasetId,
        judgeId: input.judgeId,
        targets: input.targets,
        concurrency: input.concurrency,
        alertThreshold: input.alertThreshold,
        scheduleId: input.scheduleId,
        itemTotal,
        createdBy: input.createdBy,
      })
      .returning()
    for (let start = 0; start < items.length; start += INSERT_CHUNK) {
      await tx.insert(nexoraEvalItem).values(items.slice(start, start + INSERT_CHUNK))
    }
    return campaign
  })
  return toCampaign(created)
}

/** A campaign that could not even start (a schedule whose test set is empty, say), kept so the failure shows. */
export async function insertFailedCampaign(
  input: {
    workspaceId: string
    name: string
    datasetId: string
    judgeId: string
    targets: EvalTarget[]
    concurrency: number
    alertThreshold: number | null
    scheduleId: string | null
    createdBy: string | null
  },
  error: string
): Promise<CampaignRecord> {
  const [created] = await db
    .insert(nexoraEvalCampaign)
    .values({
      id: generateId(),
      ...input,
      status: 'failed',
      error,
      finishedAt: new Date(),
    })
    .returning()
  return toCampaign(created)
}

export async function getCampaign(
  workspaceId: string,
  campaignId: string
): Promise<CampaignRecord | null> {
  const [row] = await db
    .select()
    .from(nexoraEvalCampaign)
    .where(
      and(eq(nexoraEvalCampaign.id, campaignId), eq(nexoraEvalCampaign.workspaceId, workspaceId))
    )
    .limit(1)
  return row ? toCampaign(row) : null
}

const finishedItem = sql`${nexoraEvalItem.status} IN ('done', 'error')`

/** The workspace's campaigns, newest first, with how far each has gone. */
export async function listCampaigns(
  workspaceId: string,
  limit: number
): Promise<(CampaignRecord & { progress: CampaignProgress })[]> {
  const rows = await db
    .select()
    .from(nexoraEvalCampaign)
    .where(eq(nexoraEvalCampaign.workspaceId, workspaceId))
    .orderBy(desc(nexoraEvalCampaign.createdAt), desc(nexoraEvalCampaign.id))
    .limit(limit)
  if (rows.length === 0) return []
  const progress = await db
    .select({
      campaignId: nexoraEvalItem.campaignId,
      finished: sql<number>`count(*) FILTER (WHERE ${finishedItem})::int`,
      passed: sql<number>`count(*) FILTER (WHERE ${nexoraEvalItem.verdict} = 'pass')::int`,
      errors: sql<number>`count(*) FILTER (WHERE ${nexoraEvalItem.status} = 'error' OR ${nexoraEvalItem.verdict} = 'error')::int`,
    })
    .from(nexoraEvalItem)
    .where(
      inArray(
        nexoraEvalItem.campaignId,
        rows.map((row) => row.id)
      )
    )
    .groupBy(nexoraEvalItem.campaignId)
  const byCampaign = new Map(progress.map((entry) => [entry.campaignId, entry]))
  return rows.map((row) => {
    const entry = byCampaign.get(row.id)
    return {
      ...toCampaign(row),
      progress: {
        finished: entry?.finished ?? 0,
        passed: entry?.passed ?? 0,
        errors: entry?.errors ?? 0,
      },
    }
  })
}

export interface ItemRecord {
  id: string
  campaignId: string
  rowId: string
  targetKey: string
  position: number
  status: ItemStatus
  attempt: number
  input: string
  expected: string | null
  guidance: string | null
  answer: string | null
  verdict: JudgeVerdict | null
  score: number | null
  judgeNote: string | null
  error: string | null
  latencyMs: number | null
  inputTokens: number
  outputTokens: number
  kgCo2eq: number | null
  executionId: string | null
}

const ITEM_STATUSES: readonly ItemStatus[] = ['pending', 'running', 'done', 'error']
const VERDICTS: readonly JudgeVerdict[] = ['pass', 'fail', 'error']

type ItemRow = Omit<ItemRecord, 'status' | 'verdict'> & { status: string; verdict: string | null }

function toItem(row: ItemRow): ItemRecord {
  return {
    ...row,
    status: ITEM_STATUSES.find((status) => status === row.status) ?? 'error',
    verdict: VERDICTS.find((verdict) => verdict === row.verdict) ?? null,
  }
}

function itemColumns(answerPreview: number | null) {
  return {
    id: nexoraEvalItem.id,
    campaignId: nexoraEvalItem.campaignId,
    rowId: nexoraEvalItem.rowId,
    targetKey: nexoraEvalItem.targetKey,
    position: nexoraEvalItem.position,
    status: nexoraEvalItem.status,
    attempt: nexoraEvalItem.attempt,
    input: nexoraEvalItem.input,
    expected: nexoraEvalItem.expected,
    guidance: nexoraEvalItem.guidance,
    answer:
      answerPreview === null
        ? nexoraEvalItem.answer
        : sql<string | null>`left(${nexoraEvalItem.answer}, ${answerPreview})`,
    verdict: nexoraEvalItem.verdict,
    score: nexoraEvalItem.score,
    judgeNote: nexoraEvalItem.judgeNote,
    error: nexoraEvalItem.error,
    latencyMs: nexoraEvalItem.latencyMs,
    inputTokens: nexoraEvalItem.inputTokens,
    outputTokens: nexoraEvalItem.outputTokens,
    kgCo2eq: nexoraEvalItem.kgCo2eq,
    executionId: nexoraEvalItem.executionId,
  }
}

/** A campaign's items in order; answers are cut to `answerPreview` characters (0 for none). */
export async function listItems(
  campaignId: string,
  { answerPreview }: { answerPreview: number }
): Promise<ItemRecord[]> {
  const rows = await db
    .select(itemColumns(answerPreview))
    .from(nexoraEvalItem)
    .where(eq(nexoraEvalItem.campaignId, campaignId))
    .orderBy(asc(nexoraEvalItem.position))
  return rows.map(toItem)
}

/** Takes the next pending item for this worker (counting the attempt), `null` when none is left. */
export async function claimNextItem(campaignId: string, now: Date): Promise<ItemRecord | null> {
  return db.transaction(async (tx) => {
    const [next] = await tx
      .select({ id: nexoraEvalItem.id })
      .from(nexoraEvalItem)
      .where(and(eq(nexoraEvalItem.campaignId, campaignId), eq(nexoraEvalItem.status, 'pending')))
      .orderBy(asc(nexoraEvalItem.position))
      .limit(1)
      .for('update', { skipLocked: true })
    if (!next) return null
    const [claimed] = await tx
      .update(nexoraEvalItem)
      .set({ status: 'running', attempt: sql`${nexoraEvalItem.attempt} + 1`, startedAt: now })
      .where(eq(nexoraEvalItem.id, next.id))
      .returning(itemColumns(null))
    return toItem(claimed)
  })
}

/** An item still running under the attempt a worker read when it claimed it. */
function claimedItem(itemId: string, attempt: number) {
  return and(
    eq(nexoraEvalItem.id, itemId),
    eq(nexoraEvalItem.status, 'running'),
    eq(nexoraEvalItem.attempt, attempt)
  )
}

export interface ItemResult {
  answer: string | null
  verdict: JudgeVerdict
  score: number | null
  judgeNote: string
  latencyMs: number | null
  inputTokens: number
  outputTokens: number
  kgCo2eq: number | null
  executionId: string | null
}

/**
 * Records a judged item. Only an item still running under the attempt that claimed it is written:
 * a cancelled campaign keeps its state, and a worker whose lease was taken over cannot overwrite
 * the item's new owner (its write is ignored, without error).
 */
export async function completeItem(
  itemId: string,
  attempt: number,
  result: ItemResult,
  now: Date
): Promise<void> {
  await db
    .update(nexoraEvalItem)
    .set({
      status: result.verdict === 'error' ? 'error' : 'done',
      answer: result.answer,
      verdict: result.verdict,
      score: result.score,
      judgeNote: result.judgeNote,
      latencyMs: result.latencyMs,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      kgCo2eq: result.kgCo2eq,
      executionId: result.executionId,
      error: result.verdict === 'error' ? result.judgeNote : null,
      finishedAt: now,
    })
    .where(claimedItem(itemId, attempt))
}

/** Records an item whose target could not answer (ignored once another attempt owns the item). */
export async function failItem(
  itemId: string,
  attempt: number,
  error: string,
  latencyMs: number | null,
  now: Date
): Promise<void> {
  await db
    .update(nexoraEvalItem)
    .set({ status: 'error', error, latencyMs, finishedAt: now })
    .where(claimedItem(itemId, attempt))
}

/** Puts an item back in the queue (the budget stopped the campaign before it could be answered). */
export async function releaseItem(itemId: string, attempt: number): Promise<void> {
  await db
    .update(nexoraEvalItem)
    .set({ status: 'pending', attempt: sql`GREATEST(${nexoraEvalItem.attempt} - 1, 0)` })
    .where(claimedItem(itemId, attempt))
}

/**
 * Becomes the process that runs a campaign: possible while it is pending, or running with a lease
 * that expired (its server stopped). In that second case the items it had in flight go back to the
 * queue, or are given up on after {@link MAX_ITEM_ATTEMPTS} attempts.
 */
export async function acquireCampaign(
  campaignId: string,
  owner: string,
  now: Date,
  leaseUntil: Date
): Promise<{ campaign: CampaignRecord; resumed: boolean } | null> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(nexoraEvalCampaign)
      .where(eq(nexoraEvalCampaign.id, campaignId))
      .for('update')
    if (!current) return null
    const stale =
      current.status === 'running' && current.leaseUntil !== null && current.leaseUntil < now
    if (current.status !== 'pending' && !stale) return null
    if (stale) {
      await tx
        .update(nexoraEvalItem)
        .set({
          status: sql`CASE WHEN ${nexoraEvalItem.attempt} >= ${MAX_ITEM_ATTEMPTS} THEN 'error' ELSE 'pending' END`,
          error: sql`CASE WHEN ${nexoraEvalItem.attempt} >= ${MAX_ITEM_ATTEMPTS} THEN 'Interrompu trop souvent : le serveur s’est arrêté pendant cet élément.' ELSE ${nexoraEvalItem.error} END`,
          finishedAt: sql`CASE WHEN ${nexoraEvalItem.attempt} >= ${MAX_ITEM_ATTEMPTS} THEN ${now.toISOString()}::timestamp ELSE NULL END`,
        })
        .where(and(eq(nexoraEvalItem.campaignId, campaignId), eq(nexoraEvalItem.status, 'running')))
    }
    const [campaign] = await tx
      .update(nexoraEvalCampaign)
      .set({
        status: 'running',
        leaseOwner: owner,
        leaseUntil,
        startedAt: current.startedAt ?? now,
      })
      .where(eq(nexoraEvalCampaign.id, campaignId))
      .returning()
    return { campaign: toCampaign(campaign), resumed: stale }
  })
}

/** Extends the lease; `false` when this process no longer owns a running campaign. */
export async function heartbeat(
  campaignId: string,
  owner: string,
  leaseUntil: Date
): Promise<boolean> {
  const updated = await db
    .update(nexoraEvalCampaign)
    .set({ leaseUntil })
    .where(
      and(
        eq(nexoraEvalCampaign.id, campaignId),
        eq(nexoraEvalCampaign.leaseOwner, owner),
        eq(nexoraEvalCampaign.status, 'running')
      )
    )
    .returning({ id: nexoraEvalCampaign.id })
  return updated.length > 0
}

/** Ends a campaign this process runs. A campaign cancelled meanwhile stays cancelled (`false`). */
export async function finishCampaign(
  campaignId: string,
  owner: string,
  status: Extract<CampaignStatus, 'completed' | 'interrupted' | 'failed'>,
  error: string | null = null
): Promise<boolean> {
  const updated = await db
    .update(nexoraEvalCampaign)
    .set({ status, error, finishedAt: new Date(), leaseOwner: null, leaseUntil: null })
    .where(
      and(
        eq(nexoraEvalCampaign.id, campaignId),
        eq(nexoraEvalCampaign.leaseOwner, owner),
        eq(nexoraEvalCampaign.status, 'running')
      )
    )
    .returning({ id: nexoraEvalCampaign.id })
  return updated.length > 0
}

/** Cancels a pending or running campaign; `null` when it is not active. */
export async function cancelCampaign(
  workspaceId: string,
  campaignId: string
): Promise<CampaignRecord | null> {
  const [updated] = await db
    .update(nexoraEvalCampaign)
    .set({ status: 'cancelled', finishedAt: new Date(), leaseOwner: null, leaseUntil: null })
    .where(
      and(
        eq(nexoraEvalCampaign.id, campaignId),
        eq(nexoraEvalCampaign.workspaceId, workspaceId),
        inArray(nexoraEvalCampaign.status, ['pending', 'running'])
      )
    )
    .returning()
  return updated ? toCampaign(updated) : null
}

export async function deleteCampaign(
  workspaceId: string,
  campaignId: string
): Promise<{ id: string; name: string } | null> {
  const [deleted] = await db
    .delete(nexoraEvalCampaign)
    .where(
      and(
        eq(nexoraEvalCampaign.id, campaignId),
        eq(nexoraEvalCampaign.workspaceId, workspaceId),
        inArray(nexoraEvalCampaign.status, ['completed', 'cancelled', 'interrupted', 'failed'])
      )
    )
    .returning({ id: nexoraEvalCampaign.id, name: nexoraEvalCampaign.name })
  if (deleted) return deleted
  const existing = await getCampaign(workspaceId, campaignId)
  if (existing) {
    throw new OrchestrationError(
      'conflict',
      'Cette campagne est en cours : annulez-la avant de la supprimer.'
    )
  }
  return null
}

/** The status of a campaign, read fresh (the runner checks it between items). */
export async function readCampaignStatus(campaignId: string): Promise<CampaignStatus | null> {
  const [row] = await db
    .select({ status: nexoraEvalCampaign.status })
    .from(nexoraEvalCampaign)
    .where(eq(nexoraEvalCampaign.id, campaignId))
    .limit(1)
  return CAMPAIGN_STATUSES.find((status) => status === row?.status) ?? null
}

/** Items still to do: pending or in flight. */
export async function countOpenItems(campaignId: string): Promise<number> {
  const [{ open }] = await db
    .select({ open: count() })
    .from(nexoraEvalItem)
    .where(
      and(
        eq(nexoraEvalItem.campaignId, campaignId),
        inArray(nexoraEvalItem.status, ['pending', 'running'])
      )
    )
  return open
}

/** Campaigns nobody runs: waiting to start, or running with an expired lease. */
export async function listAdoptableCampaignIds(now: Date): Promise<string[]> {
  const rows = await db
    .select({ id: nexoraEvalCampaign.id })
    .from(nexoraEvalCampaign)
    .where(
      or(
        eq(nexoraEvalCampaign.status, 'pending'),
        and(eq(nexoraEvalCampaign.status, 'running'), lt(nexoraEvalCampaign.leaseUntil, now))
      )
    )
    .orderBy(asc(nexoraEvalCampaign.createdAt))
    .limit(50)
  return rows.map((row) => row.id)
}

export interface ScheduleRecord {
  id: string
  workspaceId: string
  name: string
  cron: string
  timezone: string
  datasetId: string
  judgeId: string
  targets: EvalTarget[]
  concurrency: number
  alertThreshold: number | null
  enabled: boolean
  nextRunAt: Date | null
  lastRunAt: Date | null
  lastCampaignId: string | null
  createdBy: string | null
}

type ScheduleRow = typeof nexoraEvalSchedule.$inferSelect

function toSchedule(row: ScheduleRow): ScheduleRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    cron: row.cron,
    timezone: row.timezone,
    datasetId: row.datasetId,
    judgeId: row.judgeId,
    targets: asTargets(row.targets),
    concurrency: row.concurrency,
    alertThreshold: row.alertThreshold,
    enabled: row.enabled,
    nextRunAt: row.nextRunAt,
    lastRunAt: row.lastRunAt,
    lastCampaignId: row.lastCampaignId,
    createdBy: row.createdBy,
  }
}

export interface NewSchedule {
  workspaceId: string
  name: string
  cron: string
  timezone: string
  datasetId: string
  judgeId: string
  targets: EvalTarget[]
  concurrency: number
  alertThreshold: number | null
  nextRunAt: Date | null
  enabled?: boolean
  createdBy: string | null
}

export async function insertSchedule(input: NewSchedule): Promise<ScheduleRecord> {
  const [created] = await db
    .insert(nexoraEvalSchedule)
    .values({ id: generateId(), ...input, enabled: input.enabled ?? true })
    .returning()
  return toSchedule(created)
}

export async function updateSchedule(
  workspaceId: string,
  scheduleId: string,
  patch: Partial<Omit<NewSchedule, 'workspaceId' | 'createdBy'>>
): Promise<ScheduleRecord | null> {
  const [updated] = await db
    .update(nexoraEvalSchedule)
    .set({ ...patch, updatedAt: new Date() })
    .where(
      and(eq(nexoraEvalSchedule.id, scheduleId), eq(nexoraEvalSchedule.workspaceId, workspaceId))
    )
    .returning()
  return updated ? toSchedule(updated) : null
}

export async function getSchedule(
  workspaceId: string,
  scheduleId: string
): Promise<ScheduleRecord | null> {
  const [row] = await db
    .select()
    .from(nexoraEvalSchedule)
    .where(
      and(eq(nexoraEvalSchedule.id, scheduleId), eq(nexoraEvalSchedule.workspaceId, workspaceId))
    )
    .limit(1)
  return row ? toSchedule(row) : null
}

export async function listSchedules(workspaceId: string): Promise<ScheduleRecord[]> {
  const rows = await db
    .select()
    .from(nexoraEvalSchedule)
    .where(eq(nexoraEvalSchedule.workspaceId, workspaceId))
    .orderBy(asc(nexoraEvalSchedule.name))
    .limit(200)
  return rows.map(toSchedule)
}

export async function deleteSchedule(
  workspaceId: string,
  scheduleId: string
): Promise<{ id: string; name: string } | null> {
  const [deleted] = await db
    .delete(nexoraEvalSchedule)
    .where(
      and(eq(nexoraEvalSchedule.id, scheduleId), eq(nexoraEvalSchedule.workspaceId, workspaceId))
    )
    .returning({ id: nexoraEvalSchedule.id, name: nexoraEvalSchedule.name })
  return deleted ?? null
}

export async function setScheduleLastCampaign(
  scheduleId: string,
  campaignId: string
): Promise<void> {
  await db
    .update(nexoraEvalSchedule)
    .set({ lastCampaignId: campaignId })
    .where(eq(nexoraEvalSchedule.id, scheduleId))
}

/**
 * Takes the schedules whose time has come and moves each to its next time in the same statement
 * sequence, so however many processes ask, a schedule starts once. A schedule due several times
 * over (the server was down) starts once, not once per missed time.
 */
export async function claimDueSchedules(
  now: Date,
  nextRun: (schedule: ScheduleRecord) => Date | null
): Promise<ScheduleRecord[]> {
  return db.transaction(async (tx) => {
    const due = await tx
      .select()
      .from(nexoraEvalSchedule)
      .where(
        and(
          eq(nexoraEvalSchedule.enabled, true),
          isNotNull(nexoraEvalSchedule.nextRunAt),
          lte(nexoraEvalSchedule.nextRunAt, now)
        )
      )
      .orderBy(asc(nexoraEvalSchedule.nextRunAt))
      .limit(50)
      .for('update', { skipLocked: true })
    const claimed: ScheduleRecord[] = []
    for (const row of due) {
      const schedule = toSchedule(row)
      await tx
        .update(nexoraEvalSchedule)
        .set({ nextRunAt: nextRun(schedule), lastRunAt: now })
        .where(eq(nexoraEvalSchedule.id, row.id))
      claimed.push(schedule)
    }
    return claimed
  })
}

export interface NewAlert {
  workspaceId: string
  campaignId: string
  targetKey: string
  targetLabel: string
  kind: 'below_threshold' | 'failed'
  passRate: number | null
  threshold: number | null
}

export interface AlertRecord extends NewAlert {
  id: string
  campaignName: string
  createdAt: Date
  acknowledgedAt: Date | null
}

/** Records alerts, skipping the ones already raised for the same campaign, target and kind. */
export async function insertAlerts(alerts: readonly NewAlert[]): Promise<NewAlert[]> {
  if (alerts.length === 0) return []
  const inserted = await db
    .insert(nexoraEvalAlert)
    .values(alerts.map((alert) => ({ id: generateId(), ...alert })))
    .onConflictDoNothing({
      target: [nexoraEvalAlert.campaignId, nexoraEvalAlert.targetKey, nexoraEvalAlert.kind],
    })
    .returning({
      campaignId: nexoraEvalAlert.campaignId,
      targetKey: nexoraEvalAlert.targetKey,
      kind: nexoraEvalAlert.kind,
    })
  const raised = new Set(inserted.map((row) => `${row.campaignId}:${row.targetKey}:${row.kind}`))
  return alerts.filter((alert) =>
    raised.has(`${alert.campaignId}:${alert.targetKey}:${alert.kind}`)
  )
}

export async function listAlerts(
  workspaceId: string,
  { open }: { open: boolean }
): Promise<AlertRecord[]> {
  const rows = await db
    .select({
      id: nexoraEvalAlert.id,
      workspaceId: nexoraEvalAlert.workspaceId,
      campaignId: nexoraEvalAlert.campaignId,
      campaignName: nexoraEvalCampaign.name,
      targetKey: nexoraEvalAlert.targetKey,
      targetLabel: nexoraEvalAlert.targetLabel,
      kind: nexoraEvalAlert.kind,
      passRate: nexoraEvalAlert.passRate,
      threshold: nexoraEvalAlert.threshold,
      createdAt: nexoraEvalAlert.createdAt,
      acknowledgedAt: nexoraEvalAlert.acknowledgedAt,
    })
    .from(nexoraEvalAlert)
    .innerJoin(nexoraEvalCampaign, eq(nexoraEvalCampaign.id, nexoraEvalAlert.campaignId))
    .where(
      and(
        eq(nexoraEvalAlert.workspaceId, workspaceId),
        open ? isNull(nexoraEvalAlert.acknowledgedAt) : undefined
      )
    )
    .orderBy(desc(nexoraEvalAlert.createdAt))
    .limit(100)
  return rows.map((row) => ({
    ...row,
    kind: row.kind === 'failed' ? 'failed' : 'below_threshold',
  }))
}

/** Acknowledges an open alert of the workspace; `false` when it is unknown or already acknowledged. */
export async function acknowledgeAlert(
  workspaceId: string,
  alertId: string,
  userId: string
): Promise<boolean> {
  const updated = await db
    .update(nexoraEvalAlert)
    .set({ acknowledgedAt: new Date(), acknowledgedBy: userId })
    .where(
      and(
        eq(nexoraEvalAlert.id, alertId),
        eq(nexoraEvalAlert.workspaceId, workspaceId),
        isNull(nexoraEvalAlert.acknowledgedAt)
      )
    )
    .returning({ id: nexoraEvalAlert.id })
  return updated.length > 0
}
