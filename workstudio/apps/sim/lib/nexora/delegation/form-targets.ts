import { AGENTS_FOLDER } from '@/lib/nexora/agents'

interface FormWorkflow {
  id: string
  name: string
  folderId?: string | null
  isDeployed?: boolean
}

interface FormFolder {
  id: string
  name: string
  parentId: string | null
}

/**
 * The agents the « Peut confier à » picker offers: the deployed workflows of the top-level
 * « Agents » folder, except the agent being edited, by name. The server re-checks that an agent
 * is still published each time it is called.
 */
export function selectDelegationTargets(
  workflows: readonly FormWorkflow[],
  folders: readonly FormFolder[] | undefined,
  currentWorkflowId: string
): Array<{ id: string; name: string }> {
  const agentsFolder = folders?.find(
    (folder) => folder.name === AGENTS_FOLDER && folder.parentId === null
  )
  if (!agentsFolder) return []
  return workflows
    .filter(
      (workflow) =>
        workflow.folderId === agentsFolder.id &&
        workflow.isDeployed === true &&
        workflow.id !== currentWorkflowId
    )
    .map((workflow) => ({ id: workflow.id, name: workflow.name }))
    .sort((left, right) => left.name.localeCompare(right.name, 'fr'))
}
