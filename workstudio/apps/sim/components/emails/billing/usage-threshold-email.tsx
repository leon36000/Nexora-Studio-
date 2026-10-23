import { Section, Text } from '@react-email/components'
import { baseStyles } from '@/components/emails/_styles'
import { EmailButton, EmailLayout } from '@/components/emails/components'
import { formatEmailNumber, getEmailTranslator } from '@/components/emails/i18n'
import { dollarsToCredits } from '@/lib/billing/credits/conversion'
import { getBrandConfig } from '@/ee/whitelabeling'

interface UsageThresholdEmailProps {
  userName?: string
  planName: string
  percentUsed: number
  currentUsage: number
  limit: number
  ctaLink: string
}

export function UsageThresholdEmail({
  userName,
  planName,
  percentUsed,
  currentUsage,
  limit,
  ctaLink,
}: UsageThresholdEmailProps) {
  const brand = getBrandConfig()
  const t = getEmailTranslator()
  const percent = String(percentUsed)

  return (
    <EmailLayout
      preview={t('usageThreshold.preview', { brandName: brand.name, percent, planName })}
      showUnsubscribe={true}
    >
      <Text style={baseStyles.greeting}>
        {userName ? t('common.hiName', { name: userName }) : t('common.hi')}
      </Text>

      <Text style={baseStyles.paragraph}>{t('usageThreshold.body', { planName })}</Text>

      <Section style={baseStyles.infoBox}>
        <Text style={baseStyles.infoBoxTitle}>{t('common.usage')}</Text>
        <Text style={baseStyles.infoBoxList}>
          {t('usageThreshold.usageLine', {
            used: formatEmailNumber(dollarsToCredits(currentUsage)),
            limit: formatEmailNumber(dollarsToCredits(limit)),
            percent,
          })}
        </Text>
      </Section>

      <Text style={baseStyles.paragraph}>{t('usageThreshold.avoid')}</Text>

      <EmailButton href={ctaLink}>{t('usageThreshold.button')}</EmailButton>

      <div style={baseStyles.divider} />

      <Text style={baseStyles.footnote}>{t('common.oneTimeAt80')}</Text>
    </EmailLayout>
  )
}

export default UsageThresholdEmail
