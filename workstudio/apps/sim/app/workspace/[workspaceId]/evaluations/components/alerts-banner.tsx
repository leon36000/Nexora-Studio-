'use client'

import { Chip, ChipLink, toast } from '@sim/emcn'
import { getErrorMessage } from '@sim/utils/errors'
import { useLocale, useTranslations } from 'next-intl'
import type { NexoraEvalAlert } from '@/lib/api/contracts/nexora-evaluations'
import { formatRate } from '@/app/workspace/[workspaceId]/evaluations/utils/format'
import { useUserPermissionsContext } from '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
import { useAcknowledgeEvalAlert, useEvalAlerts } from '@/hooks/queries/nexora-evaluations'

interface AlertsBannerProps {
  workspaceId: string
}

/** Nexora edition: targets under their alert threshold, until a member acknowledges them. */
export function AlertsBanner({ workspaceId }: AlertsBannerProps) {
  const t = useTranslations('evaluations.alerts')
  const locale = useLocale()
  const { canEdit } = useUserPermissionsContext()
  const { data: alerts } = useEvalAlerts(workspaceId)
  const { mutateAsync: acknowledge, isPending } = useAcknowledgeEvalAlert()

  if (!alerts?.length) return null

  const message = (alert: NexoraEvalAlert) => {
    if (alert.kind === 'failed') {
      return alert.targetKey === '*'
        ? t('campaignStopped', { campaign: alert.campaignName })
        : t('noResult', { campaign: alert.campaignName, target: alert.targetLabel })
    }
    return t('belowThreshold', {
      campaign: alert.campaignName,
      target: alert.targetLabel,
      rate: formatRate(alert.passRate, locale),
      threshold: formatRate(alert.threshold, locale),
    })
  }

  const handleAcknowledge = async (alertId: string) => {
    try {
      await acknowledge({ workspaceId, alertId })
    } catch (error) {
      toast.error(getErrorMessage(error, t('acknowledgeFailed')))
    }
  }

  return (
    <section
      role='alert'
      aria-label={t('title')}
      className='flex flex-col divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-active)]'
    >
      {alerts.map((alert) => (
        <div key={alert.id} className='flex items-center justify-between gap-3 px-4 py-2.5'>
          <p className='min-w-0 text-[var(--text-body)] text-small'>{message(alert)}</p>
          <div className='flex shrink-0 items-center gap-1'>
            <ChipLink href={`/workspace/${workspaceId}/evaluations/campaigns/${alert.campaignId}`}>
              {t('view')}
            </ChipLink>
            {canEdit && (
              <Chip disabled={isPending} onClick={() => void handleAcknowledge(alert.id)}>
                {t('acknowledge')}
              </Chip>
            )}
          </div>
        </div>
      ))}
    </section>
  )
}
