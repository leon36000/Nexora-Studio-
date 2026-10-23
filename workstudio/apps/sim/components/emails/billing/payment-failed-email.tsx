import { Link, Section, Text } from '@react-email/components'
import { baseStyles, colors, fontWeight } from '@/components/emails/_styles'
import { EmailButton, EmailLayout } from '@/components/emails/components'
import { formatEmailAmount, getEmailTranslator } from '@/components/emails/i18n'
import { getEmailSubject } from '@/components/emails/subjects'
import { getBrandConfig } from '@/ee/whitelabeling'

interface PaymentFailedEmailProps {
  userName?: string
  amountDue: number
  lastFourDigits?: string
  billingPortalUrl: string
  failureReason?: string
}

export function PaymentFailedEmail({
  userName,
  amountDue,
  lastFourDigits,
  billingPortalUrl,
  failureReason,
}: PaymentFailedEmailProps) {
  const brand = getBrandConfig()
  const t = getEmailTranslator()

  const previewText = getEmailSubject('payment-failed')

  return (
    <EmailLayout preview={previewText} showUnsubscribe={false}>
      <Text style={baseStyles.greeting}>
        {userName ? t('common.hiName', { name: userName }) : t('common.hi')}
      </Text>

      <Text
        style={{
          ...baseStyles.paragraph,
          fontWeight: fontWeight.semibold,
          color: colors.textPrimary,
        }}
      >
        {t('paymentFailed.unable')}
      </Text>

      <Text style={baseStyles.paragraph}>{t('paymentFailed.body', { brandName: brand.name })}</Text>

      <Section style={baseStyles.errorBox}>
        <Text style={baseStyles.infoBoxTitle}>{t('paymentFailed.detailsTitle')}</Text>
        <Text style={baseStyles.infoBoxList}>
          {t('paymentFailed.amountDue', { amount: formatEmailAmount(amountDue) })}
          {lastFourDigits && (
            <>
              <br />
              {t('paymentFailed.paymentMethod', { lastFour: lastFourDigits })}
            </>
          )}
          {failureReason && (
            <>
              <br />
              {t('paymentFailed.reason', { reason: failureReason })}
            </>
          )}
        </Text>
      </Section>

      <Section style={baseStyles.infoBox}>
        <Text style={baseStyles.infoBoxTitle}>{t('paymentFailed.nextTitle')}</Text>
        <Text style={baseStyles.infoBoxList}>
          {t('paymentFailed.paused')}
          <br />
          {t('paymentFailed.update')}
          <br />
          {t('paymentFailed.retry')}
        </Text>
      </Section>

      <EmailButton href={billingPortalUrl}>{t('paymentFailed.button')}</EmailButton>

      <div style={baseStyles.divider} />

      <Text style={baseStyles.footnote}>
        {t.rich('paymentFailed.footnote', {
          email: brand.supportEmail ?? '',
          link: (chunks) => (
            <Link href={`mailto:${brand.supportEmail}`} style={baseStyles.link}>
              {chunks}
            </Link>
          ),
        })}
      </Text>
    </EmailLayout>
  )
}

export default PaymentFailedEmail
