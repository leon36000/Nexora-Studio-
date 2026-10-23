import { Section, Text } from '@react-email/components'
import { baseStyles } from '@/components/emails/_styles'
import { EmailButton, EmailLayout, EmailStrong } from '@/components/emails/components'
import {
  EMAIL_DATE_LOCALE,
  EMAIL_LOCALE,
  formatEmailNumber,
  getEmailTranslator,
} from '@/components/emails/i18n'
import { dollarsToCredits } from '@/lib/billing/credits/conversion'
import { getBaseUrl } from '@/lib/core/utils/urls'
import { APP_ENTRY_PATH } from '@/lib/navigation/paths'
import { getBrandConfig } from '@/ee/whitelabeling'

interface CreditPurchaseEmailProps {
  userName?: string
  amount: number
  newBalance: number
  purchaseDate?: Date
}

export function CreditPurchaseEmail({
  userName,
  amount,
  newBalance,
  purchaseDate = new Date(),
}: CreditPurchaseEmailProps) {
  const brand = getBrandConfig()
  const baseUrl = getBaseUrl()
  const t = getEmailTranslator()
  const credits = formatEmailNumber(dollarsToCredits(amount))

  return (
    <EmailLayout
      preview={t('creditPurchase.preview', { brandName: brand.name, credits })}
      showUnsubscribe={false}
    >
      <Text style={baseStyles.greeting}>
        {userName ? t('common.hiName', { name: userName }) : t('common.hi')}
      </Text>
      <Text style={baseStyles.paragraph}>
        {t.rich('creditPurchase.body', {
          credits,
          strong: (chunks) => <EmailStrong>{chunks}</EmailStrong>,
        })}
      </Text>

      <Section style={baseStyles.infoBox}>
        <Text style={baseStyles.infoBoxLabel}>{t('creditPurchase.amountAdded')}</Text>
        <Text style={{ ...baseStyles.infoBoxValue, marginBottom: '16px' }}>
          {t('common.creditsAmount', { credits })}
        </Text>
        <Text style={baseStyles.infoBoxLabel}>{t('creditPurchase.newBalance')}</Text>
        <Text style={baseStyles.infoBoxValue}>
          {t('common.creditsAmount', {
            credits: formatEmailNumber(dollarsToCredits(newBalance)),
          })}
        </Text>
      </Section>

      <Text style={baseStyles.paragraph}>{t('creditPurchase.applied')}</Text>

      <EmailButton href={`${baseUrl}${APP_ENTRY_PATH}`}>
        {t('creditPurchase.viewDashboard')}
      </EmailButton>

      <div style={baseStyles.divider} />

      <Text style={baseStyles.footnote}>
        {t('creditPurchase.footnote', {
          date: purchaseDate.toLocaleDateString(EMAIL_DATE_LOCALE[EMAIL_LOCALE]),
        })}
      </Text>
    </EmailLayout>
  )
}

export default CreditPurchaseEmail
