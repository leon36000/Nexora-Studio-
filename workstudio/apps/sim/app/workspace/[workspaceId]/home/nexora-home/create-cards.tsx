'use client'

import { useState } from 'react'
import { toast } from '@sim/emcn'
import { Sparkles, Workflow } from '@sim/emcn/icons'
import { createLogger } from '@sim/logger'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { buildAgentWorkflowJson } from '@/lib/nexora/agent-workflow'
import { persistImportedWorkflow } from '@/lib/workflows/operations/import-export'
import { HOME_CARD_GRID, HomeCard } from '@/app/workspace/[workspaceId]/home/nexora-home/home-card'
import { useUserPermissionsContext } from '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
import { SettingsSection } from '@/app/workspace/[workspaceId]/settings/components/settings-section/settings-section'
import { useWorkflowOperations } from '@/app/workspace/[workspaceId]/w/components/sidebar/hooks/use-workflow-operations'
import { useCreateWorkflow } from '@/hooks/queries/workflows'
import { useWorkflowDiffStore } from '@/stores/workflow-diff/store'

const logger = createLogger('NexoraHomeCreate')

interface CreateCardsProps {
  workspaceId: string
}

/**
 * « Créer »: an empty workflow (the sidebar's own creation path) or a ready-to-chat agent,
 * opened in the editor. Hidden from members who cannot edit the workspace.
 */
export function CreateCards({ workspaceId }: CreateCardsProps) {
  const t = useTranslations('home.nexoraHome.create')
  const router = useRouter()
  const { canEdit, isLoading: permissionsLoading } = useUserPermissionsContext()
  const { handleCreateWorkflow, isCreatingWorkflow } = useWorkflowOperations({ workspaceId })
  const { mutateAsync: createWorkflow } = useCreateWorkflow()
  const [isCreatingAgent, setIsCreatingAgent] = useState(false)

  if (permissionsLoading || !canEdit) return null

  const handleCreateAgent = async () => {
    setIsCreatingAgent(true)
    useWorkflowDiffStore.getState().clearDiff()
    try {
      const result = await persistImportedWorkflow({
        content: buildAgentWorkflowJson(),
        filename: 'agent.json',
        workspaceId,
        nameOverride: t('agentName'),
        createWorkflow: ({ name, description }) =>
          createWorkflow({ workspaceId, name, description, deduplicate: true }),
      })
      if (!result) throw new Error('The agent workflow could not be parsed')
      router.push(`/workspace/${workspaceId}/w/${result.workflowId}`)
    } catch (error) {
      logger.error('Agent creation failed', { workspaceId, error })
      toast.error(t('agentFailed'))
      setIsCreatingAgent(false)
    }
  }

  return (
    <SettingsSection label={t('label')}>
      <div className={HOME_CARD_GRID}>
        <HomeCard
          icon={Workflow}
          label={t('workflow')}
          disabled={isCreatingWorkflow}
          onClick={() => void handleCreateWorkflow()}
        />
        <HomeCard
          icon={Sparkles}
          label={t('agent')}
          disabled={isCreatingAgent}
          onClick={() => void handleCreateAgent()}
        />
      </div>
    </SettingsSection>
  )
}
