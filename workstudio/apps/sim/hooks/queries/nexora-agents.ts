'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { requestJson } from '@/lib/api/client/request'
import { listFoldersContract } from '@/lib/api/contracts/folders'
import {
  putWorkflowNormalizedStateContract,
  updateWorkflowContract,
} from '@/lib/api/contracts/workflows'
import {
  AGENTS_FOLDER,
  type AgentConfig,
  agentChangedSince,
  buildAgentWorkflow,
  persistedAgentConfig,
} from '@/lib/nexora/agents'
import { persistImportedWorkflow } from '@/lib/workflows/operations/import-export'
import { deploymentKeys } from '@/hooks/queries/deployments'
import { useCreateFolder } from '@/hooks/queries/folders'
import { fetchWorkflowEnvelope } from '@/hooks/queries/utils/fetch-workflow-envelope'
import { invalidateWorkflowLists } from '@/hooks/queries/utils/invalidate-workflow-lists'
import { workflowKeys } from '@/hooks/queries/utils/workflow-keys'
import { useCreateWorkflow, WORKFLOW_STATE_STALE_TIME } from '@/hooks/queries/workflows'

/**
 * The agent's stored draft, read again each time the agent page opens (the editor's changes do
 * not reach this cache): the form must start from what is stored, not from a cached copy.
 */
export function useAgentDraftState(workflowId: string) {
  return useQuery({
    queryKey: workflowKeys.state(workflowId),
    queryFn: ({ signal }) => fetchWorkflowEnvelope(workflowId, signal),
    select: (envelope) => envelope.state,
    staleTime: WORKFLOW_STATE_STALE_TIME,
    refetchOnMount: 'always',
  })
}

/** The stored agent changed since the form loaded it (another tab, the editor): nothing was saved. */
export class AgentChangedElsewhereError extends Error {
  constructor() {
    super('The agent changed since the form loaded it')
    this.name = 'AgentChangedElsewhereError'
  }
}

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
  /** What the form loaded (or last saved): the stored draft must still hold it. */
  baseline: AgentConfig
}

/**
 * Writes the agent's draft (the workflow state `buildAgentWorkflow` builds over the stored one,
 * read fresh) and its name and description on the workflow row. The welcome message is saved with
 * the public chat instead. Rejects with `AgentChangedElsewhereError`, writing nothing, when the
 * stored draft no longer holds `baseline`. Resolves with the configuration written, the baseline of
 * the next save.
 */
export function useSaveAgent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      workflowId,
      config,
      baseline,
    }: SaveAgentVariables): Promise<AgentConfig> => {
      const stored = await queryClient.fetchQuery({
        queryKey: workflowKeys.state(workflowId),
        queryFn: ({ signal }) => fetchWorkflowEnvelope(workflowId, signal),
        staleTime: 0,
      })
      if (agentChangedSince(baseline, stored.state)) throw new AgentChangedElsewhereError()
      const written = buildAgentWorkflow(config, stored.state)
      await requestJson(putWorkflowNormalizedStateContract, {
        params: { id: workflowId },
        body: written,
      })
      await requestJson(updateWorkflowContract, {
        params: { id: workflowId },
        body: { name: config.name, description: config.description },
      })
      return persistedAgentConfig(config, written)
    },
    onSettled: (_data, _error, { workspaceId, workflowId }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: workflowKeys.state(workflowId) }),
        queryClient.invalidateQueries({ queryKey: deploymentKeys.info(workflowId) }),
        invalidateWorkflowLists(queryClient, workspaceId),
      ]),
  })
}
