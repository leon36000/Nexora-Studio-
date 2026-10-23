import { Section, Text } from '@react-email/components'
import { baseStyles } from '@/components/emails/_styles'
import { EmailButton, EmailLayout } from '@/components/emails/components'
import { formatEmailNumber, getEmailTranslator } from '@/components/emails/i18n'
import { dollarsToCredits } from '@/lib/billing/credits/conversion'
import { getBrandConfig } from '@/ee/whitelabeling'

interface UsageLimitReachedEmailProps {
  userName?: string
  planName: string
  /** Drives the remedy copy and CTA label — org admins raise the org limit. */
  scope: 'user' | 'organization'
  currentUsage: number
  limit: number
  ctaLink: string
}

/**
 * Sent at 100% of the usage limit to paid and organization accounts. The
 * free-tier equivalent is `CreditsExhaustedEmail`, whose remedy is an upgrade
 * rather than a limit change.
 */
export function UsageLimitReachedEmail({
  userName,
  planName,
  scope,
  currentUsage,
  limit,
  ctaLink,
}: UsageLimitReachedEmailProps) {
  const brand = getBrandConfig()
  const t = getEmailTranslator()
  const isOrganization = scope === 'organization'

  return (
    <EmailLayout
      preview={t('usageLimitReached.preview', { brandName: brand.name, planName })}
      showUnsubscribe={true}
    >
      <Text style={baseStyles.greeting}>
        {userName ? t('common.hiName', { name: userName }) : t('common.hi')}
      </Text>

      <Text style={baseStyles.paragraph}>
        {isOrganization
          ? t('usageLimitReached.leadOrganization', { planName })
          : t('usageLimitReached.leadUser', { planName })}{' '}
        {t('usageLimitReached.paused')}
      </Text>

      <Section style={baseStyles.infoBox}>
        <Text style={baseStyles.infoBoxTitle}>{t('common.usage')}</Text>
        <Text style={baseStyles.infoBoxList}>
          {t('usageLimitReached.usageLine', {
            used: formatEmailNumber(dollarsToCredits(currentUsage)),
            limit: formatEmailNumber(dollarsToCredits(limit)),
          })}
        </Text>
      </Section>

      <Text style={baseStyles.paragraph}>
        {isOrganization
          ? t('usageLimitReached.remedyOrganization')
          : t('usageLimitReached.remedyUser')}
      </Text>

      <EmailButton href={ctaLink}>
        {isOrganization
          ? t('usageLimitReached.buttonOrganization')
          : t('usageLimitReached.buttonUser')}
      </EmailButton>

      <div style={baseStyles.divider} />

      <Text style={baseStyles.footnote}>{t('usageLimitReached.footnote')}</Text>
    </EmailLayout>
  )
}

export default UsageLimitReachedEmail
