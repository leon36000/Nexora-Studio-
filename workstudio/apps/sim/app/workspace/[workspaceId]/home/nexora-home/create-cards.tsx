'use client'

import { useState } from 'react'
import { MessageSquareText, Sparkles, Wand, Workflow } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import { useNewAgent } from '@/app/workspace/[workspaceId]/agents/use-new-agent'
import { LazyCopilotDialog } from '@/app/workspace/[workspaceId]/components/copilot-dialog'
import { HOME_CARD_GRID, HomeCard } from '@/app/workspace/[workspaceId]/home/nexora-home/home-card'
import { HomeSection } from '@/app/workspace/[workspaceId]/home/nexora-home/home-section'
import { useUserPermissionsContext } from '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
import { useWorkflowOperations } from '@/app/workspace/[workspaceId]/w/components/sidebar/hooks/use-workflow-operations'

interface CreateCardsProps {
  workspaceId: string
}

/**
 * « Créer »: an empty workflow (the sidebar's own creation path), opened in the editor, a
 * workflow described in plain words to the Copilot, or a ready-to-chat agent, opened in its form —
 * these only for members who can edit the workspace — and a conversation with the Assistant, for
 * every member.
 */
export function CreateCards({ workspaceId }: CreateCardsProps) {
  const t = useTranslations('home.nexoraHome.create')
  const tCopilot = useTranslations('copilot.entry')
  const { canEdit, isLoading: permissionsLoading } = useUserPermissionsContext()
  const { handleCreateWorkflow, isCreatingWorkflow } = useWorkflowOperations({ workspaceId })
  const { createAgent, isCreating: isCreatingAgent } = useNewAgent(workspaceId)
  const [isCopilotOpen, setIsCopilotOpen] = useState(false)

  const canCreate = !permissionsLoading && canEdit

  return (
    <HomeSection title={t('label')}>
      <div className={HOME_CARD_GRID}>
        {canCreate && (
          <HomeCard
            icon={Workflow}
            label={t('workflow')}
            disabled={isCreatingWorkflow}
            onClick={() => void handleCreateWorkflow()}
          />
        )}
        {canCreate && (
          <HomeCard
            icon={Wand}
            label={tCopilot('homeCard')}
            onClick={() => setIsCopilotOpen(true)}
          />
        )}
        {canCreate && (
          <HomeCard
            icon={Sparkles}
            label={t('agent')}
            disabled={isCreatingAgent}
            onClick={() => void createAgent()}
          />
        )}
        <HomeCard
          icon={MessageSquareText}
          label={t('assistant')}
          href={`/workspace/${workspaceId}/assistant`}
        />
      </div>
      {canCreate && (
        <LazyCopilotDialog
          workspaceId={workspaceId}
          open={isCopilotOpen}
          onOpenChange={setIsCopilotOpen}
        />
      )}
    </HomeSection>
  )
}
