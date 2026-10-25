import { z } from 'zod'
import { workspaceIdSchema } from '@/lib/api/contracts/primitives'
import { defineRouteContract } from '@/lib/api/contracts/types'

/** Traces a page holds, at most. */
export const NEXORA_TRACES_MAX_PAGE = 100
export const NEXORA_TRACES_DEFAULT_PAGE = 50
/** Where a trace came from; the order the Traces screen's filter lists them in. */
export const NEXORA_TRACE_SOURCES = [
  'assistant',
  'agent',
  'playground',
  'copilot',
  'wand',
  'workflow',
  'api_key',
] as const
export const NEXORA_TRACE_SPAN_KINDS = ['model', 'tool', 'knowledge', 'delegation', 'step'] as const

const sourceSchema = z.enum(NEXORA_TRACE_SOURCES)
const statusSchema = z.enum(['ok', 'error'])

const traceSummarySchema = z.object({
  id: z.string(),
  workspaceId: z.string().nullable(),
  userId: z.string().nullable(),
  userName: z.string().nullable(),
  apiKeyId: z.string().nullable(),
  source: z.string(),
  /** `private`: read only by its author and the workspace's administrators. */
  visibility: z.enum(['workspace', 'private']),
  name: z.string(),
  agentId: z.string().nullable(),
  agentName: z.string().nullable(),
  model: z.string().nullable(),
  models: z.array(z.string()),
  status: statusSchema,
  error: z.string().nullable(),
  startedAt: z.iso.datetime(),
  durationMs: z.number(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  /** Estimated from Nexora API's measured carbon per token; `null` when no model was measured. */
  kgCo2eq: z.number().nullable(),
  spanCount: z.number(),
  toolCount: z.number(),
  /** Some content was cut to the storage limits. */
  truncated: z.boolean(),
  /** How many personal data were masked before the trace was stored. */
  maskedCount: z.number(),
  executionId: z.string().nullable(),
  inputPreview: z.string().nullable(),
  outputPreview: z.string().nullable(),
})

const traceSpanSchema = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  position: z.number(),
  kind: z.enum(NEXORA_TRACE_SPAN_KINDS),
  name: z.string(),
  model: z.string().nullable(),
  startedAt: z.iso.datetime(),
  durationMs: z.number(),
  status: statusSchema,
  inputTokens: z.number(),
  outputTokens: z.number(),
  kgCo2eq: z.number().nullable(),
  input: z.string().nullable(),
  output: z.string().nullable(),
  attributes: z.record(z.string(), z.unknown()),
})

export type NexoraTraceSummary = z.output<typeof traceSummarySchema>
export type NexoraTraceSpan = z.output<typeof traceSpanSchema>

const traceFiltersSchema = z.object({
  status: statusSchema.optional(),
  model: z.string().trim().min(1).max(200).optional(),
  agentId: z.string().trim().min(1).max(200).optional(),
  apiKeyId: z.string().trim().min(1).max(200).optional(),
  source: sourceSchema.optional(),
  minDurationMs: z.coerce.number().int().min(0).max(86_400_000).optional(),
  maxDurationMs: z.coerce.number().int().min(0).max(86_400_000).optional(),
  q: z.string().trim().min(1).max(200).optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  cursor: z.string().max(200).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(NEXORA_TRACES_MAX_PAGE)
    .default(NEXORA_TRACES_DEFAULT_PAGE),
})

export type NexoraTraceFiltersQuery = z.input<typeof traceFiltersSchema>

const traceListResponseSchema = z.object({
  traces: z.array(traceSummarySchema),
  nextCursor: z.string().nullable(),
})

const traceDetailResponseSchema = z.object({
  trace: traceSummarySchema,
  spans: z.array(traceSpanSchema),
})

const facetsResponseSchema = z.object({
  agents: z.array(z.object({ id: z.string(), name: z.string() })),
  models: z.array(z.string()),
  apiKeys: z.array(z.object({ id: z.string(), name: z.string() })),
  sources: z.array(z.string()),
})

export type NexoraTraceFacets = z.output<typeof facetsResponseSchema>

const traceIdParamsSchema = z.object({ traceId: z.string().regex(/^[0-9a-f]{32}$/) })

/** A workspace's traces, newest first, as its reader may see them. */
export const listWorkspaceTracesContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/traces',
  query: traceFiltersSchema.extend({ workspaceId: workspaceIdSchema }),
  response: { mode: 'json', schema: traceListResponseSchema },
})

export const getWorkspaceTraceContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/traces/[traceId]',
  params: traceIdParamsSchema,
  query: z.object({ workspaceId: workspaceIdSchema }),
  response: { mode: 'json', schema: traceDetailResponseSchema },
})

/** The values the filters offer, from the traces the reader may see. */
export const listWorkspaceTraceFacetsContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/traces/facets',
  query: z.object({ workspaceId: workspaceIdSchema }),
  response: { mode: 'json', schema: facetsResponseSchema },
})

/** Traces of no workspace (instance keys). Instance administrators. */
export const listInstanceTracesContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/traces/instance',
  query: traceFiltersSchema,
  response: { mode: 'json', schema: traceListResponseSchema },
})

export const getInstanceTraceContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/traces/instance/[traceId]',
  params: traceIdParamsSchema,
  response: { mode: 'json', schema: traceDetailResponseSchema },
})

const redactionSchema = z.enum(['standard', 'strict', 'none'])

const traceSettingsSchema = z.object({
  enabled: z.boolean(),
  retentionDays: z.number(),
  redaction: redactionSchema,
  conversationRetentionDays: z.number().nullable(),
  otlp: z.object({
    enabled: z.boolean(),
    endpoint: z.string(),
    /** Names only: a header's value is never sent back. */
    headers: z.array(z.object({ name: z.string(), hasValue: z.boolean() })),
  }),
})

export type NexoraTraceSettings = z.output<typeof traceSettingsSchema>

const traceSettingsResponseSchema = z.object({
  settings: traceSettingsSchema,
  /** The latest export of this process, for the settings screen; `null` before the first one. */
  lastExport: z
    .object({ at: z.iso.datetime(), ok: z.boolean(), error: z.string().optional() })
    .nullable(),
})

const traceSettingsChangeSchema = z.object({
  enabled: z.boolean().optional(),
  retentionDays: z.number().int().min(1).max(365).optional(),
  redaction: redactionSchema.optional(),
  conversationRetentionDays: z.number().int().min(1).max(3650).nullable().optional(),
  otlp: z
    .object({
      enabled: z.boolean().optional(),
      endpoint: z.string().trim().max(2000).optional(),
      headers: z
        .array(
          z.object({
            name: z.string().trim().min(1).max(64),
            /** Empty keeps the value stored under that name. */
            value: z.string().max(4000).optional(),
          })
        )
        .max(10)
        .optional(),
    })
    .optional(),
})

export type NexoraTraceSettingsChange = z.input<typeof traceSettingsChangeSchema>

export const getTraceSettingsContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/traces/settings',
  response: { mode: 'json', schema: traceSettingsResponseSchema },
})

export const updateTraceSettingsContract = defineRouteContract({
  method: 'PUT',
  path: '/api/nexora/traces/settings',
  body: traceSettingsChangeSchema,
  response: { mode: 'json', schema: traceSettingsResponseSchema },
})

export const testTraceExportContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/traces/settings/test-export',
  response: {
    mode: 'json',
    schema: z.object({ ok: z.boolean(), status: z.number().optional(), error: z.string().optional() }),
  },
})

/** « Purge now »: deletes what is older than the retention; `asOf` plays another clock (tests). */
export const purgeTracesContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/traces/purge',
  body: z.object({
    workspaceId: workspaceIdSchema.optional(),
    asOf: z.iso.datetime().optional(),
  }),
  response: {
    mode: 'json',
    schema: z.object({
      deletedTraces: z.number(),
      deletedConversations: z.number(),
      retentionDays: z.number(),
    }),
  },
})
