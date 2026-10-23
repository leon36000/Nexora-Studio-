import { Body, Head, Html, Preview, Text } from '@react-email/components'
import { plainEmailStyles as styles } from '@/components/emails/_styles'
import { EMAIL_LOCALE, getEmailTranslator } from '@/components/emails/i18n'
import { getBrandConfig } from '@/ee/whitelabeling'

interface AbandonedCheckoutEmailProps {
  userName?: string
}

export function AbandonedCheckoutEmail({ userName }: AbandonedCheckoutEmailProps) {
  const brand = getBrandConfig()
  const t = getEmailTranslator()

  return (
    <Html lang={EMAIL_LOCALE}>
      <Head />
      <Preview>{t('abandonedCheckout.preview')}</Preview>
      <Body style={styles.body}>
        <div style={styles.container}>
          <Text style={styles.p}>
            {userName ? t('common.hiName', { name: userName }) : t('common.hi')}
          </Text>
          <Text style={styles.p}>{t('abandonedCheckout.attempt', { brandName: brand.name })}</Text>
          <Text style={styles.p}>{t('abandonedCheckout.help')}</Text>
          <Text style={styles.p}>
            {t('abandonedCheckout.signature')}
            <br />
            {t('common.founder', { brandName: brand.name })}
          </Text>
        </div>
      </Body>
    </Html>
  )
}

export default AbandonedCheckoutEmail
