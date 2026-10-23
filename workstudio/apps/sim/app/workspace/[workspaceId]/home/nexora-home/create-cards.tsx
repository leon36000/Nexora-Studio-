'use client'

import { Sparkles, Workflow } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import { useNewAgent } from '@/app/workspace/[workspaceId]/agents/use-new-agent'
import { HOME_CARD_GRID, HomeCard } from '@/app/workspace/[workspaceId]/home/nexora-home/home-card'
import { useUserPermissionsContext } from '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
import { SettingsSection } from '@/app/workspace/[workspaceId]/settings/components/settings-section/settings-section'
import { useWorkflowOperations } from '@/app/workspace/[workspaceId]/w/components/sidebar/hooks/use-workflow-operations'

interface CreateCardsProps {
  workspaceId: string
}

/**
 * « Créer »: an empty workflow (the sidebar's own creation path), opened in the editor, or a
 * ready-to-chat agent, opened in its form. Hidden from members who cannot edit the workspace.
 */
export function CreateCards({ workspaceId }: CreateCardsProps) {
  const t = useTranslations('home.nexoraHome.create')
  const { canEdit, isLoading: permissionsLoading } = useUserPermissionsContext()
  const { handleCreateWorkflow, isCreatingWorkflow } = useWorkflowOperations({ workspaceId })
  const { createAgent, isCreating: isCreatingAgent } = useNewAgent(workspaceId)

  if (permissionsLoading || !canEdit) return null

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
          onClick={() => void createAgent()}
        />
      </div>
    </SettingsSection>
  )
}
