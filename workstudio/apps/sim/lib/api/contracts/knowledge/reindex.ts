import { z } from 'zod'
import {
  knowledgeBaseParamsSchema,
  successResponseSchema,
} from '@/lib/api/contracts/knowledge/shared'
import { defineRouteContract } from '@/lib/api/contracts/types'

const reindexStateSchema = z.object({
  status: z.enum(['running', 'completed', 'failed']),
  sourceModel: z.string(),
  targetModel: z.string(),
  targetDimension: z.number().int(),
  totalChunks: z.number().int(),
  embeddedChunks: z.number().int(),
  /** Why the last attempt stopped; the base kept its previous index. */
  errorCode: z.enum(['model-unavailable', 'chunk-too-long', 'failed']).nullable(),
  error: z.string().nullable(),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  /** Running, but no worker has moved it for a while: it may be started again. */
  stalled: z.boolean(),
})

const reindexViewSchema = z.object({
  embeddingModel: z.string(),
  embeddingDimension: z.number().int(),
  /** Documents of the base, the number a reindex re-embeds. */
  documentCount: z.number().int(),
  chunkCount: z.number().int(),
  reindex: reindexStateSchema.nullable(),
})

/** Nexora edition: a base's embedding model and the progress of its latest reindex. */
export const getKnowledgeReindexContract = defineRouteContract({
  method: 'GET',
  path: '/api/knowledge/[id]/reindex',
  params: knowledgeBaseParamsSchema,
  response: { mode: 'json', schema: successResponseSchema(reindexViewSchema) },
})

/** Starts re-embedding every chunk of the base with another model of the instance's Ollama. */
export const startKnowledgeReindexContract = defineRouteContract({
  method: 'POST',
  path: '/api/knowledge/[id]/reindex',
  params: knowledgeBaseParamsSchema,
  body: z.object({ model: z.string().trim().min(1).max(200) }),
  response: { mode: 'json', schema: successResponseSchema(reindexViewSchema) },
})

/** Embedding models of the instance's Ollama a base can be reindexed with. */
export const listKnowledgeEmbeddingModelsContract = defineRouteContract({
  method: 'GET',
  path: '/api/knowledge/[id]/reindex/models',
  params: knowledgeBaseParamsSchema,
  response: {
    mode: 'json',
    schema: successResponseSchema(
      z.object({
        models: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            dimensions: z.number().int(),
          })
        ),
      })
    ),
  },
})
