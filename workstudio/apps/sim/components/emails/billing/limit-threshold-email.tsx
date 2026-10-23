import { Section, Text } from '@react-email/components'
import { baseStyles } from '@/components/emails/_styles'
import { EmailButton, EmailLayout } from '@/components/emails/components'
import { getEmailTranslator } from '@/components/emails/i18n'
import type { UpgradeReason } from '@/lib/billing/upgrade-reasons'
import { getBrandConfig } from '@/ee/whitelabeling'

interface LimitThresholdEmailProps {
  /** `warning` = approaching the limit (~80%); `reached` = at/over the limit. */
  kind: 'warning' | 'reached'
  /** Limit category, drives the shared copy. */
  reason: UpgradeReason
  userName?: string
  /** Pre-formatted current usage, e.g. "4.2 GB", "48,000 rows", "9 seats". */
  usageLabel: string
  /** Pre-formatted limit, e.g. "5 GB", "50,000 rows", "10 seats". */
  limitLabel: string
  percentUsed: number
  upgradeLink: string
}

/**
 * Single template for the per-category usage-limit emails (storage, tables,
 * seats). The lead sentence is shared with the subject line from
 * `getLimitEmailSubject`, so both say the same thing.
 */
export function LimitThresholdEmail({
  kind,
  reason,
  userName,
  usageLabel,
  limitLabel,
  percentUsed,
  upgradeLink,
}: LimitThresholdEmailProps) {
  const brand = getBrandConfig()
  const t = getEmailTranslator()
  const copyKey = `limitThreshold.reasons.${reason}`
  const lead = t(`${copyKey}.${kind === 'reached' ? 'reachedLead' : 'warningLead'}`)

  return (
    <EmailLayout
      preview={t('limitThreshold.preview', { brandName: brand.name, lead })}
      showUnsubscribe={true}
    >
      <Text style={baseStyles.greeting}>
        {userName ? t('common.hiName', { name: userName }) : t('common.hi')}
      </Text>

      <Text style={baseStyles.paragraph}>
        {t('limitThreshold.body', { lead, noun: t(`${copyKey}.noun`) })}
      </Text>

      <Section style={baseStyles.infoBox}>
        <Text style={baseStyles.infoBoxTitle}>{t('common.usage')}</Text>
        <Text style={baseStyles.infoBoxList}>
          {t('limitThreshold.usageLine', {
            usage: usageLabel,
            limit: limitLabel,
            percent: String(percentUsed),
          })}
        </Text>
      </Section>

      <EmailButton href={upgradeLink}>{t('limitThreshold.upgrade')}</EmailButton>

      <div style={baseStyles.divider} />

      <Text style={baseStyles.footnote}>
        {kind === 'reached' ? t('common.oneTimeAt100') : t('common.oneTimeAt80')}
      </Text>
    </EmailLayout>
  )
}

export default LimitThresholdEmail
