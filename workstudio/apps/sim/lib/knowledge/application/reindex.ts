import { AuditAction, AuditResourceType } from '@sim/audit'
import type { Principal } from '@sim/auth/principal'
import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { OrchestrationError } from '@/lib/core/orchestration/types'
import { processOutboxEventById } from '@/lib/core/outbox/service'
import { toOllamaEmbeddingModelId } from '@/lib/embeddings/catalog'
import {
  fetchOllamaEmbeddingModelCatalog,
  getOllamaEmbeddingModelMetadata,
  OllamaEmbeddingModelNotFoundError,
  OllamaEmbeddingWidthUnknownError,
} from '@/lib/embeddings/ollama-model-catalog.server'
import { defineAuthorizedKnowledgeUseCase } from '@/lib/knowledge/application/authorized-knowledge-use-case'
import { resolveActiveKnowledgeBaseContext } from '@/lib/knowledge/application/contexts'
import { knowledgeOperations } from '@/lib/knowledge/application/operations'
import {
  isKbEmbeddingDimensions,
  KB_EMBEDDING_STORAGE_DIMENSIONS,
} from '@/lib/knowledge/embedding-models'
import {
  type KnowledgeReindexView,
  readKnowledgeReindexView,
  startKnowledgeReindex,
} from '@/lib/knowledge/reindex/service'

const logger = createLogger('KnowledgeReindexApplication')

interface KnowledgeReindexInput {
  knowledgeBaseId: string
  assertedWorkspaceId?: string
}

export interface StartKnowledgeReindexInput extends KnowledgeReindexInput {
  /** An embedding model of the instance's Ollama, with or without the `ollama/` prefix. */
  model: string
}

export interface KnowledgeEmbeddingModelOption {
  id: string
  name: string
  dimensions: number
}

function resolveContext({
  principal,
  input,
}: {
  principal: Principal
  input: KnowledgeReindexInput
}) {
  return resolveActiveKnowledgeBaseContext(input, principal)
}

/** The base's embedding model and the progress of its latest reindex. */
export const readKnowledgeReindex = defineAuthorizedKnowledgeUseCase({
  operation: knowledgeOperations.readReindex,
  resolveContext,
  execute: ({ context }) => readKnowledgeReindexView(context.knowledgeBaseId),
})

/**
 * Embedding models installed on the instance's Ollama that a base can store (their width has a
 * vector column). Reindexing moves a base only between these local models, so its chunks never
 * leave the instance.
 */
export const listKnowledgeEmbeddingModels = defineAuthorizedKnowledgeUseCase({
  operation: knowledgeOperations.readReindex,
  resolveContext,
  async execute(): Promise<{ models: KnowledgeEmbeddingModelOption[] }> {
    const installed = await fetchOllamaEmbeddingModelCatalog()
    return {
      models: installed.flatMap((model) =>
        model.dimensions !== undefined && isKbEmbeddingDimensions(model.dimensions)
          ? [
              {
                id: toOllamaEmbeddingModelId(model.id),
                name: model.id,
                dimensions: model.dimensions,
              },
            ]
          : []
      ),
    }
  },
})

/** The width the model emits, read from Ollama; refused when no vector column can hold it. */
async function resolveTarget(model: string): Promise<{ model: string; dimensions: number }> {
  const id = toOllamaEmbeddingModelId(model)
  let dimensions: number
  try {
    dimensions = (await getOllamaEmbeddingModelMetadata(id)).dimensions
  } catch (error) {
    if (
      error instanceof OllamaEmbeddingModelNotFoundError ||
      error instanceof OllamaEmbeddingWidthUnknownError
    ) {
      throw new OrchestrationError('validation', error.message)
    }
    throw error
  }
  if (!isKbEmbeddingDimensions(dimensions)) {
    throw new OrchestrationError(
      'validation',
      `${id} emits ${dimensions}-dimensional vectors, which knowledge bases cannot store (supported: ${KB_EMBEDDING_STORAGE_DIMENSIONS.join(', ')})`
    )
  }
  return { model: id, dimensions }
}

interface StartedReindex {
  view: KnowledgeReindexView
  eventId: string
  previousModel: string
}

/**
 * Starts re-embedding the base with another local model. The base keeps searching its current
 * vectors until every chunk has one of the new model, then switches at once; the run itself is a
 * background job, started right away and resumed by the outbox after a restart.
 */
export const startKnowledgeReindexOperation = defineAuthorizedKnowledgeUseCase({
  operation: knowledgeOperations.reindex,
  resolveContext: ({
    principal,
    input,
  }: {
    principal: Principal
    input: StartKnowledgeReindexInput
  }) => resolveActiveKnowledgeBaseContext(input, principal),
  async execute({ principal, input, context }): Promise<StartedReindex> {
    const target = await resolveTarget(input.model)
    const previousModel = context.knowledgeBase.embeddingModel
    const { eventId } = await startKnowledgeReindex({
      knowledgeBaseId: context.knowledgeBaseId,
      target,
      requestedBy: principal.userId,
    })
    return { view: await readKnowledgeReindexView(context.knowledgeBaseId), eventId, previousModel }
  },
  projectAudit: ({ context, result }) => ({
    action: AuditAction.KNOWLEDGE_BASE_UPDATED,
    resourceType: AuditResourceType.KNOWLEDGE_BASE,
    resourceId: context.knowledgeBaseId,
    resourceName: context.knowledgeBase.name,
    description: `Started reindexing knowledge base "${context.knowledgeBase.name}" with ${result.view.reindex?.targetModel ?? 'another model'}`,
    metadata: {
      updatedFields: ['embeddingModel'],
      previousEmbeddingModel: result.previousModel,
      embeddingModel: result.view.reindex?.targetModel ?? null,
    },
  }),
  afterSuccess: ({ result }) => {
    /** Starts the first slice now rather than at the next outbox tick; the outbox owns retries. */
    void import('@/lib/knowledge/reindex/outbox-handler')
      .then(({ knowledgeReindexOutboxHandlers }) =>
        processOutboxEventById(result.eventId, knowledgeReindexOutboxHandlers)
      )
      .catch((error: unknown) => {
        logger.warn('Knowledge reindex will start at the next outbox run', {
          error: getErrorMessage(error),
        })
      })
  },
})
