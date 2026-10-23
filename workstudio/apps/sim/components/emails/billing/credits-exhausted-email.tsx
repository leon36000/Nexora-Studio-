import { Text } from '@react-email/components'
import { baseStyles } from '@/components/emails/_styles'
import { ProFeaturesBox } from '@/components/emails/billing/pro-features-box'
import { EmailButton, EmailLayout, EmailStrong } from '@/components/emails/components'
import { formatEmailNumber, getEmailTranslator } from '@/components/emails/i18n'
import { dollarsToCredits } from '@/lib/billing/credits/conversion'
import { getBrandConfig } from '@/ee/whitelabeling'

interface CreditsExhaustedEmailProps {
  userName?: string
  limit: number
  upgradeLink: string
}

export function CreditsExhaustedEmail({
  userName,
  limit,
  upgradeLink,
}: CreditsExhaustedEmailProps) {
  const brand = getBrandConfig()
  const t = getEmailTranslator()
  const credits = formatEmailNumber(dollarsToCredits(limit))

  return (
    <EmailLayout
      preview={t('creditsExhausted.preview', { credits, brandName: brand.name })}
      showUnsubscribe={true}
    >
      <Text style={baseStyles.greeting}>
        {userName ? t('common.hiName', { name: userName }) : t('common.hi')}
      </Text>

      <Text style={baseStyles.paragraph}>
        {t.rich('creditsExhausted.body', {
          credits,
          brandName: brand.name,
          strong: (chunks) => <EmailStrong>{chunks}</EmailStrong>,
        })}
      </Text>

      <ProFeaturesBox />

      <EmailButton href={upgradeLink}>{t('common.upgradeToPro')}</EmailButton>

      <div style={baseStyles.divider} />

      <Text style={baseStyles.footnote}>{t('creditsExhausted.footnote')}</Text>
    </EmailLayout>
  )
}

export default CreditsExhaustedEmail
