import { buildFolderTree } from '@/lib/folders/tree'
import type { FolderTreeNode, WorkflowFolder } from '@/stores/folders/types'

interface FolderChoice {
  id: string
  /** Root-first path, `Parent / Child`. */
  label: string
}

/**
 * Folders a new workflow can go in, in the sidebar's order, labelled with their path. A locked
 * folder and everything inside it are left out: the server refuses to create a workflow there.
 */
export function folderChoices(
  folders: Record<string, WorkflowFolder>,
  workspaceId: string
): FolderChoice[] {
  const choices: FolderChoice[] = []
  const visit = (nodes: FolderTreeNode[], parentLabel: string | null) => {
    for (const node of nodes) {
      if (node.locked) continue
      const label = parentLabel ? `${parentLabel} / ${node.name}` : node.name
      choices.push({ id: node.id, label })
      visit(node.children, label)
    }
  }
  visit(buildFolderTree(folders, workspaceId), null)
  return choices
}

/**
 * The first suggested folder (the sidebar's current one, say) that is still a choice, or `null`
 * for the workspace root.
 */
export function defaultFolderId(
  choices: readonly FolderChoice[],
  suggested: ReadonlyArray<string | null | undefined>
): string | null {
  for (const id of suggested) {
    if (id && choices.some((choice) => choice.id === id)) return id
  }
  return null
}
