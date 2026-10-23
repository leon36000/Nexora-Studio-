import { AuditAction, type AuditLogParams, AuditResourceType } from '@sim/audit'
import type { KnowledgeReindexErrorCode } from '@/lib/knowledge/reindex/failure'

interface ReindexedBase {
  id: string
  name: string
  workspaceId: string | null
}

interface ReindexRun {
  generation: string
  sourceModel: string
  sourceDimension: number
  targetModel: string
  targetDimension: number
}

/**
 * The start of a reindex: the model asked for. The base itself does not change until the switch,
 * so this entry claims no updated field.
 */
export function knowledgeReindexStartedAudit(
  base: Pick<ReindexedBase, 'id' | 'name'>,
  run: ReindexRun
) {
  return {
    action: AuditAction.KNOWLEDGE_BASE_REINDEX_STARTED,
    resourceType: AuditResourceType.KNOWLEDGE_BASE,
    resourceId: base.id,
    resourceName: base.name,
    description: `Started reindexing knowledge base "${base.name}" with ${run.targetModel}`,
    metadata: {
      generation: run.generation,
      currentEmbeddingModel: run.sourceModel,
      currentEmbeddingDimension: run.sourceDimension,
      targetEmbeddingModel: run.targetModel,
      targetEmbeddingDimension: run.targetDimension,
    },
  }
}

/** The switch: the base now searches with the new model. Recorded for whoever asked for it. */
export function knowledgeReindexCompletedAudit(
  base: ReindexedBase,
  run: ReindexRun,
  requestedBy: string | null
): AuditLogParams {
  return {
    workspaceId: base.workspaceId,
    actorId: requestedBy,
    action: AuditAction.KNOWLEDGE_BASE_UPDATED,
    resourceType: AuditResourceType.KNOWLEDGE_BASE,
    resourceId: base.id,
    resourceName: base.name,
    description: `Knowledge base "${base.name}" now searches with ${run.targetModel} (reindex finished)`,
    metadata: {
      generation: run.generation,
      updatedFields: ['embeddingModel', 'embeddingDimension'],
      previousEmbeddingModel: run.sourceModel,
      previousEmbeddingDimension: run.sourceDimension,
      embeddingModel: run.targetModel,
      embeddingDimension: run.targetDimension,
    },
  }
}

/** A reindex that stopped: why, and the model the base keeps searching with. */
export function knowledgeReindexFailedAudit(
  base: ReindexedBase,
  run: ReindexRun,
  requestedBy: string | null,
  failure: { code: KnowledgeReindexErrorCode; message: string }
): AuditLogParams {
  return {
    workspaceId: base.workspaceId,
    actorId: requestedBy,
    action: AuditAction.KNOWLEDGE_BASE_REINDEX_FAILED,
    resourceType: AuditResourceType.KNOWLEDGE_BASE,
    resourceId: base.id,
    resourceName: base.name,
    description: `Reindexing knowledge base "${base.name}" with ${run.targetModel} failed; it keeps ${run.sourceModel}`,
    metadata: {
      generation: run.generation,
      errorCode: failure.code,
      error: failure.message,
      embeddingModel: run.sourceModel,
      targetEmbeddingModel: run.targetModel,
    },
  }
}
