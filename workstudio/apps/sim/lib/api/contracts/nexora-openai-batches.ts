import { z } from 'zod'
import { defineRouteContract } from '@/lib/api/contracts/types'

/**
 * Files and batches of the OpenAI-compatible developer API (`<instance>/v1/files`, `/v1/batches`,
 * rewritten to `/api/nexora/v1/*`). The wire objects follow OpenAI's, so the official clients
 * parse them.
 */

const fileObjectSchema = z
  .object({
    id: z.string(),
    object: z.literal('file'),
    bytes: z.number(),
    created_at: z.number(),
    filename: z.string(),
    purpose: z.string(),
    status: z.string(),
    expires_at: z.number().nullable(),
  })
  .passthrough()

const batchObjectSchema = z
  .object({
    id: z.string(),
    object: z.literal('batch'),
    endpoint: z.string(),
    model: z.string(),
    status: z.string(),
    input_file_id: z.string().nullable(),
    output_file_id: z.string().nullable(),
    error_file_id: z.string().nullable(),
    created_at: z.number(),
    expires_at: z.number().nullable(),
    request_counts: z.object({ total: z.number(), completed: z.number(), failed: z.number() }),
  })
  .passthrough()

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  after: z.string().min(1).max(200).optional(),
})

const filesListQuerySchema = listQuerySchema.extend({
  purpose: z.string().min(1).max(50).optional(),
})

const fileParamsSchema = z.object({ fileId: z.string().min(1).max(200) })
const batchParamsSchema = z.object({ batchId: z.string().min(1).max(200) })

/** `POST /v1/files` (multipart: `file`, `purpose`). */
export const nexoraCreateFileContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/v1/files',
  response: { mode: 'json', schema: fileObjectSchema },
})

/** `GET /v1/files`: the files of the key's workspace (or of the instance keys). */
export const nexoraListFilesContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/v1/files',
  query: filesListQuerySchema,
  response: {
    mode: 'json',
    schema: z.object({ object: z.literal('list'), data: z.array(fileObjectSchema) }).passthrough(),
  },
})

/** `GET /v1/files/{file_id}`. */
export const nexoraRetrieveFileContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/v1/files/[fileId]',
  params: fileParamsSchema,
  response: { mode: 'json', schema: fileObjectSchema },
})

/** `DELETE /v1/files/{file_id}`. */
export const nexoraDeleteFileContract = defineRouteContract({
  method: 'DELETE',
  path: '/api/nexora/v1/files/[fileId]',
  params: fileParamsSchema,
  response: {
    mode: 'json',
    schema: z.object({ id: z.string(), object: z.literal('file'), deleted: z.literal(true) }),
  },
})

/** `GET /v1/files/{file_id}/content`: the JSONL of an input, output or error file. */
export const nexoraFileContentContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/v1/files/[fileId]/content',
  params: fileParamsSchema,
  response: { mode: 'stream' },
})

const createBatchBodySchema = z.object({
  input_file_id: z.string({ error: 'input_file_id is required' }).min(1).max(200),
  endpoint: z.string({ error: 'endpoint is required' }).min(1).max(100),
  completion_window: z.string().max(10).optional(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
})

/** `POST /v1/batches`. */
export const nexoraCreateBatchContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/v1/batches',
  body: createBatchBodySchema,
  response: { mode: 'json', schema: batchObjectSchema },
})

/** `GET /v1/batches`. */
export const nexoraListBatchesContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/v1/batches',
  query: listQuerySchema,
  response: {
    mode: 'json',
    schema: z.object({ object: z.literal('list'), data: z.array(batchObjectSchema) }).passthrough(),
  },
})

/** `GET /v1/batches/{batch_id}`. */
export const nexoraRetrieveBatchContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/v1/batches/[batchId]',
  params: batchParamsSchema,
  response: { mode: 'json', schema: batchObjectSchema },
})

/** `POST /v1/batches/{batch_id}/cancel`. */
export const nexoraCancelBatchContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/v1/batches/[batchId]/cancel',
  params: batchParamsSchema,
  response: { mode: 'json', schema: batchObjectSchema },
})
