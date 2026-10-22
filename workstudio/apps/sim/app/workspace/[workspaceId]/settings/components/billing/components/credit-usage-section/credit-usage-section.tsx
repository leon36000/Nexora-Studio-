'use client'

import { ChipLink } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import { SettingsSection } from '@/app/workspace/[workspaceId]/settings/components/settings-section/settings-section'
import { useUsageSummary } from '@/hooks/queries/usage-logs'

/** Period the compact Billing glance summarizes; the full page offers finer control. */
const SUMMARY_PERIOD = '30d'

/**
 * Compact "how much have I used" glance in Billing settings — a single total
 * plus a link to the full, filterable Credit usage page. Shown to every plan
 * except Enterprise, which manages billing out-of-band.
 */
interface CreditUsageSectionProps {
  href?: string
}

export function CreditUsageSection({
  href = '/account/settings/billing/credit-usage',
}: CreditUsageSectionProps) {
  const t = useTranslations('settings.billing.creditUsageSection')
  const { data: totalCredits, isPending, isError } = useUsageSummary(SUMMARY_PERIOD)

  return (
    <SettingsSection label={t('label')}>
      <div className='flex items-center justify-between px-2'>
        <div className='flex flex-col justify-center gap-[1px]'>
          <span className='text-[var(--text-body)] text-sm'>
            {isPending || isError ? '—' : t('credits', { count: totalCredits ?? 0 })}
          </span>
          <span className='text-[var(--text-muted)] text-caption'>{t('last30Days')}</span>
        </div>
        <ChipLink href={href}>{t('viewUsageLogs')}</ChipLink>
      </div>
    </SettingsSection>
  )
}
