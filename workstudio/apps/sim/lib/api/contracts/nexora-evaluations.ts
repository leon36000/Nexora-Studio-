import { z } from 'zod'
import { nonEmptyIdSchema, workspaceIdSchema } from '@/lib/api/contracts/primitives'
import { defineRouteContract } from '@/lib/api/contracts/types'
import { MAX_CAMPAIGN_CONCURRENCY, MAX_DATASET_ROWS } from '@/lib/nexora/evaluations/types'

const nameSchema = z.string().trim().min(1, 'Donnez un nom').max(100, '100 caractères au plus')
const descriptionSchema = z.string().trim().max(500, '500 caractères au plus')
const modelIdSchema = z.string().trim().min(1, 'Choisissez un modèle').max(200)
const shortText = z.string().max(20_000)

const workspaceQuerySchema = z.object({ workspaceId: workspaceIdSchema })

const judgeConfigSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('contains'),
    value: z.string().max(2000).nullable(),
    caseSensitive: z.boolean(),
  }),
  z.object({
    kind: z.literal('regex'),
    pattern: z.string().min(1, 'Saisissez un motif').max(500),
    caseSensitive: z.boolean(),
  }),
  z.object({
    kind: z.literal('json_valid'),
    requiredKeys: z.array(z.string().trim().min(1).max(100)).max(50),
  }),
  z.object({
    kind: z.literal('llm_class'),
    model: modelIdSchema,
    instructions: z.string().max(6000),
    labels: z.array(z.string().trim().min(1).max(60)).min(2).max(10),
    passLabels: z.array(z.string().trim().min(1).max(60)).min(1).max(10),
  }),
  z.object({
    kind: z.literal('llm_score'),
    model: modelIdSchema,
    instructions: z.string().max(6000),
    min: z.number().min(0).max(1000),
    max: z.number().min(1).max(1000),
    passAt: z.number().min(0).max(1000),
  }),
  z.object({
    kind: z.literal('semantic'),
    model: modelIdSchema,
    passAt: z.number().min(0).max(1),
  }),
])
export type NexoraEvalJudgeConfig = z.output<typeof judgeConfigSchema>

const judgeSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.string(),
  config: judgeConfigSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type NexoraEvalJudge = z.output<typeof judgeSchema>

const judgeBodySchema = z.object({
  workspaceId: workspaceIdSchema,
  name: nameSchema,
  config: judgeConfigSchema,
})

const judgeParamsSchema = z.object({ judgeId: nonEmptyIdSchema })

const verdictSchema = z.enum(['pass', 'fail', 'error'])
const humanVerdictSchema = z.enum(['pass', 'fail'])

const agreementSchema = z.object({
  total: z.number().int(),
  matched: z.number().int(),
  rate: z.number().nullable(),
})

const tryResultSchema = z.object({
  rowId: z.string(),
  input: z.string(),
  answer: z.string(),
  usedExpected: z.boolean(),
  humanVerdict: humanVerdictSchema.nullable(),
  humanNote: z.string().nullable(),
  verdict: verdictSchema,
  score: z.number().nullable(),
  note: z.string(),
})
export type NexoraEvalTryResult = z.output<typeof tryResultSchema>

export const listEvalJudgesContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/evaluations/judges',
  query: workspaceQuerySchema,
  response: { mode: 'json', schema: z.object({ judges: z.array(judgeSchema) }) },
})

export const createEvalJudgeContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/evaluations/judges',
  body: judgeBodySchema,
  response: { mode: 'json', schema: z.object({ judge: judgeSchema }) },
})
export type CreateNexoraEvalJudgeBody = z.input<typeof judgeBodySchema>

export const updateEvalJudgeContract = defineRouteContract({
  method: 'PUT',
  path: '/api/nexora/evaluations/judges/[judgeId]',
  params: judgeParamsSchema,
  body: judgeBodySchema,
  response: { mode: 'json', schema: z.object({ judge: judgeSchema }) },
})

export const deleteEvalJudgeContract = defineRouteContract({
  method: 'DELETE',
  path: '/api/nexora/evaluations/judges/[judgeId]',
  params: judgeParamsSchema,
  query: workspaceQuerySchema,
  response: { mode: 'json', schema: z.object({ success: z.literal(true) }) },
})

const tryBodySchema = z.object({
  workspaceId: workspaceIdSchema,
  config: judgeConfigSchema,
  datasetId: nonEmptyIdSchema,
  limit: z.number().int().min(1).max(10).default(10),
})
export type TryNexoraEvalJudgeBody = z.input<typeof tryBodySchema>

export const tryEvalJudgeContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/evaluations/judges/try',
  body: tryBodySchema,
  response: {
    mode: 'json',
    schema: z.object({ results: z.array(tryResultSchema), agreement: agreementSchema }),
  },
})

const columnMappingSchema = z
  .object({
    input: z.string().optional(),
    expected: z.string().optional(),
    guidance: z.string().optional(),
    candidate: z.string().optional(),
    verdict: z.string().optional(),
    justification: z.string().optional(),
  })
  .optional()

const datasetSourceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('empty') }),
  z.object({
    kind: z.literal('csv'),
    text: z.string().max(25_000_000),
    mapping: columnMappingSchema,
  }),
  z.object({
    kind: z.literal('jsonl'),
    text: z.string().max(25_000_000),
    mapping: columnMappingSchema,
  }),
  z.object({ kind: z.literal('table'), tableId: nonEmptyIdSchema, mapping: columnMappingSchema }),
  z.object({
    kind: z.literal('traces'),
    traceIds: z.array(nonEmptyIdSchema).min(1).max(500),
  }),
  z.object({
    kind: z.literal('conversations'),
    conversationIds: z.array(nonEmptyIdSchema).min(1).max(50),
  }),
])
export type NexoraEvalDatasetSource = z.input<typeof datasetSourceSchema>

const datasetSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  source: z.string(),
  rowCount: z.number().int(),
  annotatedCount: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type NexoraEvalDataset = z.output<typeof datasetSchema>

const rowSchema = z.object({
  id: z.string(),
  position: z.number().int(),
  input: z.string(),
  expected: z.string().nullable(),
  guidance: z.string().nullable(),
  candidate: z.string().nullable(),
  humanVerdict: humanVerdictSchema.nullable(),
  humanNote: z.string().nullable(),
  sourceRef: z.string().nullable(),
})
export type NexoraEvalRow = z.output<typeof rowSchema>

const rowInputSchema = z.object({
  input: z.string().trim().min(1, 'La question est obligatoire').max(20_000),
  expected: shortText.nullish(),
  guidance: shortText.nullish(),
  candidate: shortText.nullish(),
  humanVerdict: humanVerdictSchema.nullish(),
  humanNote: shortText.nullish(),
})
export type NexoraEvalRowInput = z.input<typeof rowInputSchema>

const datasetParamsSchema = z.object({ datasetId: nonEmptyIdSchema })

export const listEvalDatasetsContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/evaluations/datasets',
  query: workspaceQuerySchema,
  response: { mode: 'json', schema: z.object({ datasets: z.array(datasetSchema) }) },
})

const createDatasetBodySchema = z.object({
  workspaceId: workspaceIdSchema,
  name: nameSchema,
  description: descriptionSchema.default(''),
  source: datasetSourceSchema,
})
export type CreateNexoraEvalDatasetBody = z.input<typeof createDatasetBodySchema>

export const createEvalDatasetContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/evaluations/datasets',
  body: createDatasetBodySchema,
  response: {
    mode: 'json',
    schema: z.object({ dataset: datasetSchema, skipped: z.number().int() }),
  },
})

export const getEvalDatasetContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/evaluations/datasets/[datasetId]',
  params: datasetParamsSchema,
  query: z.object({
    workspaceId: workspaceIdSchema,
    limit: z.coerce.number().int().min(1).max(500).default(200),
    offset: z.coerce.number().int().min(0).max(MAX_DATASET_ROWS).default(0),
  }),
  response: {
    mode: 'json',
    schema: z.object({ dataset: datasetSchema, rows: z.array(rowSchema) }),
  },
})

export const deleteEvalDatasetContract = defineRouteContract({
  method: 'DELETE',
  path: '/api/nexora/evaluations/datasets/[datasetId]',
  params: datasetParamsSchema,
  query: workspaceQuerySchema,
  response: { mode: 'json', schema: z.object({ success: z.literal(true) }) },
})

export const appendEvalRowsContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/evaluations/datasets/[datasetId]/rows',
  params: datasetParamsSchema,
  body: z.object({
    workspaceId: workspaceIdSchema,
    rows: z.array(rowInputSchema).min(1).max(500),
  }),
  response: { mode: 'json', schema: z.object({ added: z.number().int() }) },
})

const updateRowBodySchema = z.object({
  workspaceId: workspaceIdSchema,
  patch: rowInputSchema.partial(),
})
export type UpdateNexoraEvalRowBody = z.input<typeof updateRowBodySchema>

export const updateEvalRowContract = defineRouteContract({
  method: 'PATCH',
  path: '/api/nexora/evaluations/datasets/[datasetId]/rows/[rowId]',
  params: z.object({ datasetId: nonEmptyIdSchema, rowId: nonEmptyIdSchema }),
  body: updateRowBodySchema,
  response: { mode: 'json', schema: z.object({ row: rowSchema }) },
})

export const deleteEvalRowContract = defineRouteContract({
  method: 'DELETE',
  path: '/api/nexora/evaluations/datasets/[datasetId]/rows/[rowId]',
  params: z.object({ datasetId: nonEmptyIdSchema, rowId: nonEmptyIdSchema }),
  query: workspaceQuerySchema,
  response: { mode: 'json', schema: z.object({ success: z.literal(true) }) },
})

const importSourcesSchema = z.object({
  tables: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      rowCount: z.number().int(),
      columns: z.array(z.string()),
    })
  ),
  traces: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      startedAt: z.iso.datetime(),
      input: z.string().nullable(),
      output: z.string().nullable(),
    })
  ),
  conversations: z.array(
    z.object({ id: z.string(), title: z.string(), updatedAt: z.iso.datetime() })
  ),
})

export const listEvalImportSourcesContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/evaluations/sources',
  query: workspaceQuerySchema,
  response: { mode: 'json', schema: importSourcesSchema },
})

const promptSelectorSchema = z.enum(['production', 'test', 'latest'])

export const targetInputSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('model'),
    model: modelIdSchema,
    system: z.string().max(10_000).nullish(),
  }),
  z.object({
    kind: z.literal('prompt'),
    model: modelIdSchema,
    promptId: nonEmptyIdSchema,
    selector: promptSelectorSchema.nullish(),
    version: z.number().int().min(1).nullish(),
    variables: z.record(z.string(), z.string().max(2000)).optional(),
  }),
  z.object({ kind: z.literal('agent'), workflowId: nonEmptyIdSchema }),
])
export type NexoraEvalTargetInput = z.input<typeof targetInputSchema>

const targetSchema = z.object({
  key: z.string(),
  label: z.string(),
  kind: z.enum(['model', 'prompt', 'agent']),
})

const campaignStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'cancelled',
  'interrupted',
  'failed',
])

const campaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  datasetId: z.string(),
  judgeId: z.string(),
  targets: z.array(targetSchema),
  concurrency: z.number().int(),
  alertThreshold: z.number().nullable(),
  status: campaignStatusSchema,
  error: z.string().nullable(),
  scheduleId: z.string().nullable(),
  itemTotal: z.number().int(),
  createdAt: z.iso.datetime(),
  startedAt: z.iso.datetime().nullable(),
  finishedAt: z.iso.datetime().nullable(),
})
export type NexoraEvalCampaign = z.output<typeof campaignSchema>

const campaignListEntrySchema = campaignSchema.extend({
  progress: z.object({
    finished: z.number().int(),
    passed: z.number().int(),
    errors: z.number().int(),
  }),
})
export type NexoraEvalCampaignListEntry = z.output<typeof campaignListEntrySchema>

const summarySchema = z.object({
  total: z.number().int(),
  finished: z.number().int(),
  passed: z.number().int(),
  failed: z.number().int(),
  errors: z.number().int(),
  passRate: z.number().nullable(),
  meanScore: z.number().nullable(),
  latencyP50: z.number().nullable(),
  latencyP95: z.number().nullable(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  kgCo2eq: z.number().nullable(),
})
export type NexoraEvalSummary = z.output<typeof summarySchema>

const itemSchema = z.object({
  id: z.string(),
  rowId: z.string(),
  targetKey: z.string(),
  position: z.number().int(),
  status: z.enum(['pending', 'running', 'done', 'error']),
  input: z.string(),
  expected: z.string().nullable(),
  answer: z.string().nullable(),
  verdict: verdictSchema.nullable(),
  score: z.number().nullable(),
  judgeNote: z.string().nullable(),
  error: z.string().nullable(),
  latencyMs: z.number().nullable(),
})
export type NexoraEvalItem = z.output<typeof itemSchema>

const campaignParamsSchema = z.object({ campaignId: nonEmptyIdSchema })

export const listEvalCampaignsContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/evaluations/campaigns',
  query: workspaceQuerySchema,
  response: { mode: 'json', schema: z.object({ campaigns: z.array(campaignListEntrySchema) }) },
})

const createCampaignBodySchema = z.object({
  workspaceId: workspaceIdSchema,
  name: nameSchema,
  datasetId: nonEmptyIdSchema,
  judgeId: nonEmptyIdSchema,
  targets: z.array(targetInputSchema).min(1).max(8),
  concurrency: z.number().int().min(1).max(MAX_CAMPAIGN_CONCURRENCY).default(2),
  alertThreshold: z.number().min(0).max(1).nullish(),
})
export type CreateNexoraEvalCampaignBody = z.input<typeof createCampaignBodySchema>

export const createEvalCampaignContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/evaluations/campaigns',
  body: createCampaignBodySchema,
  response: { mode: 'json', schema: z.object({ campaign: campaignSchema }) },
})

export const getEvalCampaignContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/evaluations/campaigns/[campaignId]',
  params: campaignParamsSchema,
  query: workspaceQuerySchema,
  response: {
    mode: 'json',
    schema: z.object({
      campaign: campaignSchema,
      datasetName: z.string().nullable(),
      judgeName: z.string().nullable(),
      summaries: z.array(z.object({ targetKey: z.string(), summary: summarySchema })),
      items: z.array(itemSchema),
    }),
  },
})

export const cancelEvalCampaignContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/evaluations/campaigns/[campaignId]/cancel',
  params: campaignParamsSchema,
  body: z.object({ workspaceId: workspaceIdSchema }),
  response: { mode: 'json', schema: z.object({ campaign: campaignSchema }) },
})

export const deleteEvalCampaignContract = defineRouteContract({
  method: 'DELETE',
  path: '/api/nexora/evaluations/campaigns/[campaignId]',
  params: campaignParamsSchema,
  query: workspaceQuerySchema,
  response: { mode: 'json', schema: z.object({ success: z.literal(true) }) },
})

const comparedSideSchema = z.object({
  campaignId: z.string(),
  campaignName: z.string(),
  targetKey: z.string(),
  targetLabel: z.string(),
  summary: summarySchema,
})
const comparedItemSchema = z.object({
  answer: z.string().nullable(),
  verdict: verdictSchema.nullable(),
  score: z.number().nullable(),
  latencyMs: z.number().nullable(),
})

const comparisonSchema = z.object({
  a: comparedSideSchema,
  b: comparedSideSchema,
  rows: z.array(
    z.object({
      rowId: z.string(),
      input: z.string(),
      change: z.enum(['improved', 'regressed', 'same', 'only_a', 'only_b']),
      a: comparedItemSchema.nullable(),
      b: comparedItemSchema.nullable(),
    })
  ),
  counts: z.object({
    improved: z.number().int(),
    regressed: z.number().int(),
    same: z.number().int(),
    onlyA: z.number().int(),
    onlyB: z.number().int(),
  }),
})
export type NexoraEvalComparison = z.output<typeof comparisonSchema>

export const compareEvalCampaignsContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/evaluations/compare',
  query: z.object({
    workspaceId: workspaceIdSchema,
    a: z.string().min(3).max(300),
    b: z.string().min(3).max(300),
  }),
  response: { mode: 'json', schema: comparisonSchema },
})

const scheduleSchema = z.object({
  id: z.string(),
  name: z.string(),
  cron: z.string(),
  timezone: z.string(),
  datasetId: z.string(),
  judgeId: z.string(),
  targets: z.array(targetSchema),
  concurrency: z.number().int(),
  alertThreshold: z.number().nullable(),
  enabled: z.boolean(),
  nextRunAt: z.iso.datetime().nullable(),
  lastRunAt: z.iso.datetime().nullable(),
  lastCampaignId: z.string().nullable(),
})
export type NexoraEvalSchedule = z.output<typeof scheduleSchema>

const scheduleBodySchema = z.object({
  workspaceId: workspaceIdSchema,
  name: nameSchema,
  cron: z.string().trim().min(1, 'Saisissez une expression').max(100),
  timezone: z.string().trim().min(1).max(100),
  datasetId: nonEmptyIdSchema,
  judgeId: nonEmptyIdSchema,
  targets: z.array(targetInputSchema).min(1).max(8),
  concurrency: z.number().int().min(1).max(MAX_CAMPAIGN_CONCURRENCY).default(2),
  alertThreshold: z.number().min(0).max(1).nullish(),
  enabled: z.boolean().default(true),
})
export type NexoraEvalScheduleBody = z.input<typeof scheduleBodySchema>

const scheduleParamsSchema = z.object({ scheduleId: nonEmptyIdSchema })

export const listEvalSchedulesContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/evaluations/schedules',
  query: workspaceQuerySchema,
  response: { mode: 'json', schema: z.object({ schedules: z.array(scheduleSchema) }) },
})

export const createEvalScheduleContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/evaluations/schedules',
  body: scheduleBodySchema,
  response: { mode: 'json', schema: z.object({ schedule: scheduleSchema }) },
})

export const updateEvalScheduleContract = defineRouteContract({
  method: 'PUT',
  path: '/api/nexora/evaluations/schedules/[scheduleId]',
  params: scheduleParamsSchema,
  body: scheduleBodySchema,
  response: { mode: 'json', schema: z.object({ schedule: scheduleSchema }) },
})

export const deleteEvalScheduleContract = defineRouteContract({
  method: 'DELETE',
  path: '/api/nexora/evaluations/schedules/[scheduleId]',
  params: scheduleParamsSchema,
  query: workspaceQuerySchema,
  response: { mode: 'json', schema: z.object({ success: z.literal(true) }) },
})

export const runEvalScheduleContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/evaluations/schedules/[scheduleId]/run',
  params: scheduleParamsSchema,
  body: z.object({ workspaceId: workspaceIdSchema }),
  response: { mode: 'json', schema: z.object({ campaign: campaignSchema }) },
})

const alertSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  campaignName: z.string(),
  targetKey: z.string(),
  targetLabel: z.string(),
  kind: z.enum(['below_threshold', 'failed']),
  passRate: z.number().nullable(),
  threshold: z.number().nullable(),
  createdAt: z.iso.datetime(),
  acknowledgedAt: z.iso.datetime().nullable(),
})
export type NexoraEvalAlert = z.output<typeof alertSchema>

/** The cron tick; `asOf` plays the clock of another moment (a night schedule under test). */
export const runEvalCronContract = defineRouteContract({
  method: 'GET',
  path: '/api/cron/run-nexora-evaluations',
  query: z.object({ asOf: z.iso.datetime().optional() }),
  response: {
    mode: 'json',
    schema: z.object({
      success: z.literal(true),
      started: z.array(z.string()),
      failed: z.array(z.string()),
      resumed: z.array(z.string()),
    }),
  },
})

export const listEvalAlertsContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/evaluations/alerts',
  query: workspaceQuerySchema,
  response: { mode: 'json', schema: z.object({ alerts: z.array(alertSchema) }) },
})

export const acknowledgeEvalAlertContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/evaluations/alerts/[alertId]/acknowledge',
  params: z.object({ alertId: nonEmptyIdSchema }),
  body: z.object({ workspaceId: workspaceIdSchema }),
  response: { mode: 'json', schema: z.object({ success: z.literal(true) }) },
})
