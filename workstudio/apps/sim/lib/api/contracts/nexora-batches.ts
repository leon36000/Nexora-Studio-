import { z } from 'zod'
import { targetInputSchema } from '@/lib/api/contracts/nexora-evaluations'
import { nonEmptyIdSchema, workspaceIdSchema } from '@/lib/api/contracts/primitives'
import { defineRouteContract } from '@/lib/api/contracts/types'
import { MAX_BATCH_CONCURRENCY, MAX_COMPLETION_HOURS } from '@/lib/nexora/batches/types'

/**
 * The batches screen (« Traitements par lot »): lots created from a table, and the batches made
 * through the OpenAI-compatible API, listed together. Session only; the API's own wire format is
 * in `nexora-openai-batches.ts`.
 */

const workspaceQuerySchema = z.object({ workspaceId: workspaceIdSchema })
const batchParamsSchema = z.object({ batchId: nonEmptyIdSchema })

const batchStatusSchema = z.enum([
  'in_progress',
  'cancelling',
  'completed',
  'failed',
  'expired',
  'cancelled',
])

const batchSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  source: z.enum(['api', 'table']),
  model: z.string(),
  status: batchStatusSchema,
  tableId: z.string().nullable(),
  outputColumnName: z.string().nullable(),
  concurrency: z.number(),
  total: z.number(),
  completed: z.number(),
  failed: z.number(),
  skipped: z.number(),
  promptTokens: z.number(),
  completionTokens: z.number(),
  errors: z.array(z.object({ code: z.string(), message: z.string() })).nullable(),
  createdAt: z.iso.datetime(),
  startedAt: z.iso.datetime().nullable(),
  finishedAt: z.iso.datetime().nullable(),
  expiresAt: z.iso.datetime(),
})
export type NexoraBatch = z.output<typeof batchSchema>

const resultSchema = z.object({
  position: z.number(),
  customId: z.string(),
  input: z.string().nullable(),
  answer: z.string(),
  status: z.enum(['pending', 'running', 'done', 'error']),
  error: z.string().nullable(),
  latencyMs: z.number().nullable(),
})
export type NexoraBatchResult = z.output<typeof resultSchema>

export const listBatchesContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/batches',
  query: workspaceQuerySchema,
  response: { mode: 'json', schema: z.object({ batches: z.array(batchSchema) }) },
})

export const getBatchContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/batches/[batchId]',
  params: batchParamsSchema,
  query: workspaceQuerySchema.extend({
    after: z.coerce.number().int().min(-1).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
  }),
  response: {
    mode: 'json',
    schema: z.object({ batch: batchSchema, results: z.array(resultSchema) }),
  },
})

const createBatchBodySchema = z.object({
  workspaceId: workspaceIdSchema,
  name: z.string().trim().min(1, 'Donnez un nom').max(100, '100 caractères au plus'),
  tableId: nonEmptyIdSchema,
  target: targetInputSchema,
  template: z.string().trim().min(1, 'Écrivez le texte à envoyer pour chaque ligne').max(10_000),
  outputColumnName: z.string().trim().min(1, 'Nommez la colonne de résultat').max(64),
  maxTokens: z.number().int().min(1).max(8192).nullish(),
  concurrency: z.number().int().min(1).max(MAX_BATCH_CONCURRENCY).default(2),
  expiresInHours: z.number().int().min(1).max(MAX_COMPLETION_HOURS).default(24),
})
export type CreateNexoraBatchBody = z.input<typeof createBatchBodySchema>

export const createBatchContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/batches',
  body: createBatchBodySchema,
  response: { mode: 'json', schema: z.object({ batch: batchSchema }) },
})

export const cancelBatchContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/batches/[batchId]/cancel',
  params: batchParamsSchema,
  body: z.object({ workspaceId: workspaceIdSchema }),
  response: { mode: 'json', schema: z.object({ batch: batchSchema }) },
})

export const deleteBatchContract = defineRouteContract({
  method: 'DELETE',
  path: '/api/nexora/batches/[batchId]',
  params: batchParamsSchema,
  query: workspaceQuerySchema,
  response: { mode: 'json', schema: z.object({ success: z.literal(true) }) },
})

/** The results as a CSV a French spreadsheet opens. */
export const exportBatchContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/batches/[batchId]/export',
  params: batchParamsSchema,
  query: workspaceQuerySchema,
  response: { mode: 'binary' },
})

export const listBatchSourcesContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/batches/sources',
  query: workspaceQuerySchema,
  response: {
    mode: 'json',
    schema: z.object({
      tables: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          rowCount: z.number(),
          columns: z.array(z.string()),
        })
      ),
    }),
  },
})
