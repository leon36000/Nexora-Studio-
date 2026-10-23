import { useMemo } from 'react'
import { NEXORA_TEMPLATES_FOLDER } from '@/lib/nexora/templates'
import { useFolders } from '@/hooks/queries/folders'
import { useWorkflows } from '@/hooks/queries/workflows'
import type { WorkflowMetadata } from '@/stores/workflows/registry/types'

const NO_TEMPLATES: WorkflowMetadata[] = []

/**
 * The workflows in the workspace's « Modèles PME » folder, in sidebar order. Empty when the
 * folder was renamed, removed, or never created (`NEXORA_TEMPLATES_DISABLED`).
 */
export function useTemplateWorkflows(workspaceId: string) {
  const { data: folders } = useFolders(workspaceId)
  const { data: workflows, isLoading } = useWorkflows(workspaceId)

  const templates = useMemo(() => {
    const folder = folders?.find(
      (candidate) => candidate.name === NEXORA_TEMPLATES_FOLDER && candidate.parentId === null
    )
    if (!folder || !workflows) return NO_TEMPLATES
    return workflows
      .filter((workflow) => workflow.folderId === folder.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [folders, workflows])

  return { templates, isLoading }
}
