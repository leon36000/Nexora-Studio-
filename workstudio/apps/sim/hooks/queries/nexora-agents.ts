'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { requestJson } from '@/lib/api/client/request'
import { listFoldersContract } from '@/lib/api/contracts/folders'
import {
  putWorkflowNormalizedStateContract,
  updateWorkflowContract,
} from '@/lib/api/contracts/workflows'
import { AGENTS_FOLDER, type AgentConfig, buildAgentWorkflow } from '@/lib/nexora/agents'
import { persistImportedWorkflow } from '@/lib/workflows/operations/import-export'
import { deploymentKeys } from '@/hooks/queries/deployments'
import { useCreateFolder } from '@/hooks/queries/folders'
import { invalidateWorkflowLists } from '@/hooks/queries/utils/invalidate-workflow-lists'
import { workflowKeys } from '@/hooks/queries/utils/workflow-keys'
import { useCreateWorkflow } from '@/hooks/queries/workflows'

interface CreateAgentVariables {
  workspaceId: string
  config: AgentConfig
}

/**
 * Creates an agent: a workflow in the workspace's « Agents » folder (created on first use),
 * holding the state `buildAgentWorkflow` builds. Resolves with the new workflow's id.
 */
export function useCreateAgent() {
  const { mutateAsync: createFolder } = useCreateFolder()
  const { mutateAsync: createWorkflow } = useCreateWorkflow()

  return useMutation({
    mutationFn: async ({ workspaceId, config }: CreateAgentVariables): Promise<string> => {
      const { folders } = await requestJson(listFoldersContract, {
        query: { workspaceId, scope: 'active', resourceType: 'workflow' },
      })
      const existing = folders.find(
        (folder) => folder.name === AGENTS_FOLDER && folder.parentId === null
      )
      const folderId = existing
        ? existing.id
        : (await createFolder({ workspaceId, name: AGENTS_FOLDER })).id

      const result = await persistImportedWorkflow({
        content: JSON.stringify(buildAgentWorkflow(config)),
        filename: 'agent.json',
        workspaceId,
        folderId,
        nameOverride: config.name,
        descriptionOverride: config.description,
        createWorkflow: ({ name, description }) =>
          createWorkflow({ workspaceId, name, description, folderId, deduplicate: true }),
      })
      if (!result) throw new Error('The agent workflow could not be parsed')
      return result.workflowId
    },
  })
}

interface SaveAgentVariables {
  workspaceId: string
  workflowId: string
  config: AgentConfig
  /** The state being replaced; its block ids are kept while it is still in the agent shape. */
  previousState: unknown
}

/**
 * Writes the agent's draft (the workflow state `buildAgentWorkflow` builds) and its name and
 * description on the workflow row. The welcome message is saved with the public chat instead.
 */
export function useSaveAgent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ workflowId, config, previousState }: SaveAgentVariables) => {
      await requestJson(putWorkflowNormalizedStateContract, {
        params: { id: workflowId },
        body: buildAgentWorkflow(config, previousState),
      })
      await requestJson(updateWorkflowContract, {
        params: { id: workflowId },
        body: { name: config.name, description: config.description },
      })
    },
    onSettled: (_data, _error, { workspaceId, workflowId }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: workflowKeys.state(workflowId) }),
        queryClient.invalidateQueries({ queryKey: deploymentKeys.info(workflowId) }),
        invalidateWorkflowLists(queryClient, workspaceId),
      ]),
  })
}
