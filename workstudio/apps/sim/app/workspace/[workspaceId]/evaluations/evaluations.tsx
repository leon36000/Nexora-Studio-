'use client'

import { ChipLink, ChipSwitch } from '@sim/emcn'
import { HelpCircle } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import { useQueryStates } from 'nuqs'
import { docsUrl } from '@/lib/branding/docs-url'
import { AlertsBanner } from '@/app/workspace/[workspaceId]/evaluations/components/alerts-banner'
import { CampaignsTab } from '@/app/workspace/[workspaceId]/evaluations/components/campaigns-tab'
import { DatasetsTab } from '@/app/workspace/[workspaceId]/evaluations/components/datasets-tab'
import { JudgesTab } from '@/app/workspace/[workspaceId]/evaluations/components/judges-tab'
import { SchedulesTab } from '@/app/workspace/[workspaceId]/evaluations/components/schedules-tab'
import {
  EVALUATION_TABS,
  evaluationsParsers,
  evaluationsUrlKeys,
} from '@/app/workspace/[workspaceId]/evaluations/search-params'

interface EvaluationsProps {
  workspaceId: string
}

/**
 * Nexora edition: measure the quality of agents, prompts and models. Test sets of questions,
 * judges that grade the answers, campaigns that cross them in the background, and schedules that
 * run a campaign by night and raise an alert under a threshold.
 */
export function Evaluations({ workspaceId }: EvaluationsProps) {
  const t = useTranslations('evaluations')
  const [{ tab }, setParams] = useQueryStates(evaluationsParsers, evaluationsUrlKeys)

  return (
    <div className='min-h-0 flex-1 overflow-y-auto px-6'>
      <div className='mx-auto flex w-full max-w-[64rem] flex-col gap-6 py-10'>
        <header className='flex items-center justify-between gap-4'>
          <h1 className='font-medium text-[var(--text-body)] text-lg'>{t('title')}</h1>
          <ChipLink
            href={docsUrl('/evaluations')}
            target='_blank'
            rel='noopener noreferrer'
            leftIcon={HelpCircle}
          >
            {t('help')}
          </ChipLink>
        </header>
        <AlertsBanner workspaceId={workspaceId} />
        <ChipSwitch
          aria-label={t('title')}
          className='self-start'
          options={EVALUATION_TABS.map((value) => ({ value, label: t(`tabs.${value}`) }))}
          value={tab}
          onChange={(value) => void setParams({ tab: value })}
        />
        {tab === 'campaigns' && <CampaignsTab workspaceId={workspaceId} />}
        {tab === 'datasets' && <DatasetsTab workspaceId={workspaceId} />}
        {tab === 'judges' && <JudgesTab workspaceId={workspaceId} />}
        {tab === 'schedules' && <SchedulesTab workspaceId={workspaceId} />}
      </div>
    </div>
  )
}
