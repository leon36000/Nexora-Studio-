import { Body, Head, Html, Preview, Text } from '@react-email/components'
import { plainEmailStyles as styles } from '@/components/emails/_styles'
import { EMAIL_LOCALE, getEmailTranslator } from '@/components/emails/i18n'
import { getBrandConfig } from '@/ee/whitelabeling'

interface OnboardingFollowupEmailProps {
  userName?: string
}

export function OnboardingFollowupEmail({ userName }: OnboardingFollowupEmailProps) {
  const brand = getBrandConfig()
  const t = getEmailTranslator()

  return (
    <Html lang={EMAIL_LOCALE}>
      <Head />
      <Preview>{t('onboardingFollowup.preview')}</Preview>
      <Body style={styles.body}>
        <div style={styles.container}>
          <Text style={styles.p}>
            {userName ? t('common.heyName', { name: userName }) : t('common.hey')}
          </Text>
          <Text style={styles.p}>
            {t('onboardingFollowup.enjoying', { brandName: brand.name })}
          </Text>
          <Text style={styles.p}>{t('onboardingFollowup.expectation')}</Text>
          <Text style={styles.p}>{t('onboardingFollowup.reply')}</Text>
          <Text style={styles.p}>
            {t('onboardingFollowup.thanks')}
            <br />
            {t('common.founderName')}
            <br />
            {t('common.founder', { brandName: brand.name })}
          </Text>
        </div>
      </Body>
    </Html>
  )
}

export default OnboardingFollowupEmail
