import { z } from 'zod'
import { defineRouteContract } from '@/lib/api/contracts/types'
import { canonicalOllamaName, NEXORA_MODEL_USAGES, OLLAMA_MODEL_NAME } from '@/lib/nexora/model-ids'

const modelSourceSchema = z.enum(['ollama', 'mistral', 'openai-compatible'])
const modelUsageSchema = z.enum(NEXORA_MODEL_USAGES)

const nexoraModelSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  isDefault: z.boolean(),
  usage: modelUsageSchema,
  source: modelSourceSchema,
  providerModel: z.string(),
  providerUrl: z.string().nullable(),
})

const ollamaModelNameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(OLLAMA_MODEL_NAME, 'Use an Ollama model name such as qwen2.5:7b')
  .transform(canonicalOllamaName)
const remoteModelNameSchema = z
  .string()
  .trim()
  .min(1, 'model is required')
  .max(128, 'model is too long')
  .regex(/^\S+$/, 'model cannot contain spaces')
const keySchema = z.string().trim().max(512, 'key is too long')

const modelIdParamsSchema = z.object({ id: z.coerce.number().int().positive() })

/**
 * Chat, vision and transcription models served by Nexora API, the bundled Ollama's catalog and
 * downloads (Réglages › Modèles).
 */
export const listNexoraModelsContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/models',
  response: {
    mode: 'json',
    schema: z.object({
      models: z.array(nexoraModelSchema),
      catalog: z.array(
        z.object({
          name: z.string(),
          usage: modelUsageSchema,
          diskGb: z.number(),
          memoryGb: z.number(),
          paramsB: z.number(),
          installed: z.boolean(),
        })
      ),
      localModels: z.array(z.string()),
      ollamaAvailable: z.boolean(),
    }),
  },
})

const addNexoraModelBodySchema = z.discriminatedUnion('source', [
  z.object({
    source: z.literal('ollama'),
    model: ollamaModelNameSchema,
    // Ollama serves chat and vision models; it cannot transcribe speech.
    usage: z.enum(['chat', 'vision']).default('chat'),
    totalParams: z.number().min(0).max(2000).optional(),
  }),
  z.object({
    source: z.literal('mistral'),
    model: remoteModelNameSchema,
    usage: modelUsageSchema.default('chat'),
    key: keySchema.min(1, 'a Mistral AI key is required'),
  }),
  z.object({
    source: z.literal('openai-compatible'),
    usage: modelUsageSchema.default('chat'),
    model: remoteModelNameSchema,
    url: z
      .string()
      .trim()
      .max(512, 'url is too long')
      .regex(/^https?:\/\/[^\s/]+(\/\S*)?$/, 'url must start with http:// or https://'),
    key: keySchema.optional(),
  }),
])

export type AddNexoraModelBody = z.input<typeof addNexoraModelBodySchema>

export const addNexoraModelContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/models',
  body: addNexoraModelBodySchema,
  response: { mode: 'json', schema: z.object({ model: nexoraModelSchema }) },
})

export const removeNexoraModelContract = defineRouteContract({
  method: 'DELETE',
  path: '/api/nexora/models/[id]',
  params: modelIdParamsSchema,
  response: {
    mode: 'json',
    schema: z.object({ success: z.literal(true), removedLocalModel: z.string().nullable() }),
  },
})

export const setDefaultNexoraModelContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/models/[id]/default',
  params: modelIdParamsSchema,
  response: { mode: 'json', schema: z.object({ success: z.literal(true) }) },
})

export const testNexoraModelContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/models/[id]/test',
  params: modelIdParamsSchema,
  response: {
    mode: 'json',
    schema: z.object({ latencyMs: z.number(), reply: z.string() }),
  },
})

/** Downloads a model into the bundled Ollama, streaming `data: {...}` progress events. */
export const pullOllamaModelContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/models/ollama/pull',
  body: z.object({ model: ollamaModelNameSchema }),
  response: { mode: 'stream' },
})
