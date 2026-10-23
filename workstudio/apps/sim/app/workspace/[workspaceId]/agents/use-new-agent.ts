'use client'

import { useCallback } from 'react'
import { toast } from '@sim/emcn'
import { createLogger } from '@sim/logger'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { AgentConfig } from '@/lib/nexora/agents'
import { DEFAULT_MODEL_ALIAS } from '@/lib/nexora/model-ids'
import { useCreateAgent } from '@/hooks/queries/nexora-agents'

const logger = createLogger('NexoraNewAgent')

/** Model a new agent starts on: whatever Nexora API serves as the default. */
const NEW_AGENT_MODEL = `vllm/${DEFAULT_MODEL_ALIAS}`

/**
 * Creates an agent from the default configuration (with `overrides`) and opens its form.
 * Shared by the home page's « Agent » card, the agent list and the Playground.
 */
export function useNewAgent(workspaceId: string) {
  const t = useTranslations('agents.defaults')
  const router = useRouter()
  const { mutateAsync: createAgent, isPending } = useCreateAgent()

  const create = useCallback(
    async (overrides: Partial<AgentConfig> = {}) => {
      const config: AgentConfig = {
        name: t('name'),
        description: '',
        instructions: t('instructions'),
        model: NEW_AGENT_MODEL,
        tools: [],
        knowledgeBaseIds: [],
        memory: true,
        reasoningEffort: 'auto',
        welcomeMessage: t('welcomeMessage'),
        ...overrides,
      }
      try {
        const workflowId = await createAgent({ workspaceId, config })
        router.push(`/workspace/${workspaceId}/agents/${workflowId}`)
      } catch (error) {
        logger.error('Agent creation failed', { workspaceId, error })
        toast.error(t('createFailed'))
      }
    },
    [createAgent, router, t, workspaceId]
  )

  return { createAgent: create, isCreating: isPending }
}
