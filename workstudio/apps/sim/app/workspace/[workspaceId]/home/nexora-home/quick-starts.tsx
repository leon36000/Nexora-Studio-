'use client'

import { Connections, FileText, Users } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import { HOME_CARD_GRID, HomeCard } from '@/app/workspace/[workspaceId]/home/nexora-home/home-card'
import { HomeSection } from '@/app/workspace/[workspaceId]/home/nexora-home/home-section'
import { useTemplateWorkflows } from '@/app/workspace/[workspaceId]/home/nexora-home/use-template-workflows'

interface QuickStartsProps {
  workspaceId: string
}

/**
 * « Démarrages rapides »: the SME templates of the workspace, then inviting the team and
 * connecting a tool from the connectors catalog.
 */
export function QuickStarts({ workspaceId }: QuickStartsProps) {
  const t = useTranslations('home.nexoraHome.quickStarts')
  const { templates } = useTemplateWorkflows(workspaceId)

  return (
    <HomeSection title={t('label')}>
      <div className={HOME_CARD_GRID}>
        {templates.map((template) => (
          <HomeCard
            key={template.id}
            icon={FileText}
            label={template.name}
            href={`/workspace/${workspaceId}/w/${template.id}`}
          />
        ))}
        <HomeCard
          icon={Users}
          label={t('invite')}
          href={`/workspace/${workspaceId}/settings/teammates`}
        />
        <HomeCard
          icon={Connections}
          label={t('connect')}
          href={`/workspace/${workspaceId}/connecteurs`}
        />
      </div>
    </HomeSection>
  )
}
