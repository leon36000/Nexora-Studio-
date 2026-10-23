import { createLogger } from '@sim/logger'
import { generateId } from '@sim/utils/id'
import { env, isTruthy } from '@/lib/core/config/env'
import type { CreateFolderParams, FolderMutationResult } from '@/lib/folders/orchestration'
import {
  buildTemplateWorkflow,
  NEXORA_TEMPLATES,
  NEXORA_TEMPLATES_FOLDER,
  resolveTemplateModel,
} from '@/lib/nexora/templates'
import type { ImportWorkflowParams } from '@/lib/workflows/operations/import-workflow'

const logger = createLogger('NexoraTemplates')

interface Dependencies {
  createFolder: (params: CreateFolderParams) => Promise<FolderMutationResult>
  importWorkflow: (params: ImportWorkflowParams) => Promise<unknown>
  model: string
  enabled: boolean
}

function defaultDependencies(): Dependencies {
  return {
    createFolder: async (params) =>
      (await import('@/lib/folders/orchestration')).createFolder(params),
    importWorkflow: async (params) =>
      (await import('@/lib/workflows/operations/import-workflow')).importWorkflowIntoWorkspace(
        params
      ),
    model: resolveTemplateModel(env.NEXORA_DEFAULT_MODEL),
    enabled: !isTruthy(env.NEXORA_TEMPLATES_DISABLED),
  }
}

/**
 * Nexora edition: every new workspace gets a « Modèles PME » folder with the SME
 * workflow templates, wired to the Nexora API model. Best-effort: a failure is logged
 * and never blocks workspace creation. Returns how many templates were imported.
 */
export async function seedNexoraTemplates(
  workspace: { workspaceId: string; userId: string },
  deps: Dependencies = defaultDependencies()
): Promise<number> {
  if (!deps.enabled) return 0
  let folderId: string | undefined
  try {
    const result = await deps.createFolder({
      resourceType: 'workflow',
      workspaceId: workspace.workspaceId,
      userId: workspace.userId,
      name: NEXORA_TEMPLATES_FOLDER,
    })
    folderId = result.folder?.id
    if (!result.success || !folderId) {
      logger.warn('Template folder was not created', { workspaceId: workspace.workspaceId })
      return 0
    }
  } catch (error) {
    logger.warn('Template folder creation failed', { workspaceId: workspace.workspaceId, error })
    return 0
  }

  let imported = 0
  for (const template of NEXORA_TEMPLATES) {
    try {
      await deps.importWorkflow({
        workspaceId: workspace.workspaceId,
        folderId,
        name: template.name,
        description: template.description,
        workflow: buildTemplateWorkflow(template, deps.model),
        userId: workspace.userId,
        capabilityUserId: workspace.userId,
        requestId: generateId(),
      })
      imported++
    } catch (error) {
      logger.warn('Template import failed', { template: template.slug, error })
    }
  }
  return imported
}
