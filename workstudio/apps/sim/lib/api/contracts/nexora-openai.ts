import { z } from 'zod'
import { defineRouteContract } from '@/lib/api/contracts/types'

/**
 * The OpenAI-compatible developer API (`<instance>/v1/*`, rewritten to `/api/nexora/v1/*`). Bodies
 * keep every OpenAI field the gateway does not read (`.passthrough()`): Nexora API validates what
 * it forwards, and a published agent reads only the messages.
 */

const modelNameSchema = z
  .string({ error: 'model is required' })
  .trim()
  .min(1, 'model is required')
  .max(300, 'model is at most 300 characters')

const chatMessageSchema = z
  .object({ role: z.string({ error: 'Each message needs a role' }).min(1).max(50) })
  .passthrough()

const chatCompletionsBodySchema = z
  .object({
    model: modelNameSchema,
    messages: z
      .array(chatMessageSchema, { error: 'messages must be a list' })
      .min(1, 'Send at least one message')
      .max(2000, 'At most 2000 messages'),
    stream: z.boolean().optional(),
  })
  .passthrough()

/** `POST /v1/chat/completions`: a model of the instance, or `agent:<name or id>`. */
export const nexoraChatCompletionsContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/v1/chat/completions',
  body: chatCompletionsBodySchema,
  response: { mode: 'stream' },
})

const embeddingsBodySchema = z
  .object({
    model: modelNameSchema,
    input: z.union([
      z.string(),
      z.array(z.string()).min(1).max(2048),
      z.array(z.number()).min(1),
      z.array(z.array(z.number())).min(1).max(2048),
    ]),
  })
  .passthrough()

const embeddingsResponseSchema = z
  .object({
    object: z.string(),
    data: z.array(z.object({ embedding: z.array(z.number()).or(z.string()) }).passthrough()),
    model: z.string(),
  })
  .passthrough()

/** `POST /v1/embeddings`. */
export const nexoraEmbeddingsContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/v1/embeddings',
  body: embeddingsBodySchema,
  response: { mode: 'json', schema: embeddingsResponseSchema },
})

/** `POST /v1/audio/transcriptions` (multipart: `file`, `model`, OpenAI's optional fields). */
export const nexoraTranscriptionsContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/v1/audio/transcriptions',
  response: { mode: 'stream' },
})

const speechBodySchema = z
  .object({
    model: modelNameSchema,
    input: z.string({ error: 'input is required' }).min(1, 'input is required'),
    voice: z.string().optional(),
    response_format: z.enum(['mp3', 'wav', 'flac', 'pcm']).optional(),
    speed: z.number().min(0.25).max(4).optional(),
  })
  .passthrough()

/** `POST /v1/audio/speech`: the audio of a text said by a Speech synthesis model. */
export const nexoraSpeechContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/v1/audio/speech',
  body: speechBodySchema,
  response: { mode: 'stream' },
})

const modelSchema = z
  .object({ id: z.string(), object: z.literal('model'), owned_by: z.string() })
  .passthrough()

/** `GET /v1/models`: what the key may call. */
export const nexoraModelsContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/v1/models',
  response: {
    mode: 'json',
    schema: z.object({ object: z.literal('list'), data: z.array(modelSchema) }),
  },
})

/** `GET /v1/models/{model}`. */
export const nexoraModelContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/v1/models/[model]',
  params: z.object({ model: z.string().min(1).max(300) }),
  response: { mode: 'json', schema: modelSchema },
})

/** `GET /v1/openapi.json`: the gateway's OpenAPI description (public). */
export const nexoraOpenApiContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/v1/openapi.json',
  response: {
    mode: 'json',
    schema: z
      .object({
        openapi: z.string(),
        info: z.object({ title: z.string(), version: z.string() }).passthrough(),
        paths: z.record(z.string(), z.record(z.string(), z.object({}).passthrough())),
      })
      .passthrough(),
  },
})

/** Absent for `/v1` itself (optional catch-all). */
const unknownEndpointParams = z.object({ path: z.array(z.string()).max(20).optional() })

/** `/v1` itself and any other path under it: a French 404 in OpenAI's shape. */
export const nexoraUnknownGetContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/v1/[[...path]]',
  params: unknownEndpointParams,
  response: { mode: 'stream' },
})

export const nexoraUnknownPostContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/v1/[[...path]]',
  params: unknownEndpointParams,
  response: { mode: 'stream' },
})
