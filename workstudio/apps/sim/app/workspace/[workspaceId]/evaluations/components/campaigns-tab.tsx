'use client'

import { useState } from 'react'
import { Chip, ChipTag, OverflowText } from '@sim/emcn'
import { Plus } from '@sim/emcn/icons'
import Link from 'next/link'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import type { NexoraEvalCampaignListEntry } from '@/lib/api/contracts/nexora-evaluations'
import { CampaignModal } from '@/app/workspace/[workspaceId]/evaluations/components/campaign-modal'
import { ListState, RowList } from '@/app/workspace/[workspaceId]/evaluations/components/list-state'
import { formatRate } from '@/app/workspace/[workspaceId]/evaluations/utils/format'
import { useUserPermissionsContext } from '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
import { useEvalCampaigns } from '@/hooks/queries/nexora-evaluations'

interface CampaignsTabProps {
  workspaceId: string
}

function progressOf(campaign: NexoraEvalCampaignListEntry) {
  return campaign.progress.finished > 0
    ? campaign.progress.passed / campaign.progress.finished
    : null
}

/** The workspace's campaigns, newest first, with how far each has gone. */
export function CampaignsTab({ workspaceId }: CampaignsTabProps) {
  const t = useTranslations('evaluations')
  const locale = useLocale()
  const format = useFormatter()
  const { canEdit } = useUserPermissionsContext()
  const { data: campaigns, isLoading, isError } = useEvalCampaigns(workspaceId)
  const [isCreating, setIsCreating] = useState(false)

  return (
    <div className='flex flex-col gap-4'>
      {canEdit && (
        <Chip
          variant='primary'
          leftIcon={Plus}
          className='self-start'
          onClick={() => setIsCreating(true)}
        >
          {t('campaigns.new')}
        </Chip>
      )}
      <ListState
        isLoading={isLoading}
        isError={isError}
        isEmpty={!campaigns?.length}
        errorMessage={t('campaigns.loadFailed')}
        emptyMessage={t('campaigns.empty')}
      >
        <RowList>
          {campaigns?.map((campaign) => (
            <li key={campaign.id}>
              <Link
                href={`/workspace/${workspaceId}/evaluations/campaigns/${campaign.id}`}
                className='flex items-center gap-3 px-4 py-3 transition-colors hover-hover:bg-[var(--surface-hover)] focus-visible:bg-[var(--surface-hover)] focus-visible:outline-none'
              >
                <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                  <OverflowText
                    label={campaign.name}
                    focusTarget='nearest-interactive'
                    className='text-[var(--text-body)] text-sm'
                  />
                  <OverflowText
                    label={campaign.targets.map((target) => target.label).join(' · ')}
                    focusTarget='nearest-interactive'
                    className='text-[var(--text-muted)] text-caption'
                  />
                </div>
                <span className='shrink-0 text-[var(--text-muted)] text-caption'>
                  {format.dateTime(new Date(campaign.createdAt), {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
                <span className='w-20 shrink-0 text-right text-[var(--text-body)] text-small'>
                  {t('campaigns.progress', {
                    finished: campaign.progress.finished,
                    total: campaign.itemTotal,
                  })}
                </span>
                <span className='w-14 shrink-0 text-right text-[var(--text-body)] text-small'>
                  {formatRate(progressOf(campaign), locale)}
                </span>
                <ChipTag
                  variant='gray'
                  invalid={campaign.status === 'failed' || campaign.status === 'interrupted'}
                >
                  {t(`status.${campaign.status}`)}
                </ChipTag>
              </Link>
            </li>
          ))}
        </RowList>
      </ListState>
      <CampaignModal workspaceId={workspaceId} open={isCreating} onOpenChange={setIsCreating} />
    </div>
  )
}
