import {
  ModelNotAllowedError,
  validateModelProvider,
} from '@/ee/access-control/utils/permission-check'
import { OrchestrationError } from '@/lib/core/orchestration/types'

/** Who sets up an evaluation: `userId` is `null` for a schedule whose author no longer exists. */
export interface EvaluationAccess {
  userId: string | null
  workspaceId: string
}

/**
 * Refuses (403) a model the access group of the person launching, saving or scheduling an
 * evaluation does not allow, as the Playground and table batches do. A campaign or a judge calls
 * models on the person's behalf: the group's `deniedModels` must hold there too.
 */
export async function requireEvaluationModelsAllowed(
  access: EvaluationAccess,
  models: readonly string[]
): Promise<void> {
  for (const model of new Set(models)) {
    try {
      await validateModelProvider(access.userId, access.workspaceId, model)
    } catch (error) {
      if (error instanceof ModelNotAllowedError) {
        throw new OrchestrationError(
          'forbidden',
          `Votre groupe d’accès ne vous autorise pas le modèle « ${model.replace(/^vllm\//, '')} ».`
        )
      }
      throw error
    }
  }
}
