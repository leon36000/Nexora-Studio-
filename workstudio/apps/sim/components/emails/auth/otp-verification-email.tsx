import { Section, Text } from '@react-email/components'
import { baseStyles } from '@/components/emails/_styles'
import { EmailLayout } from '@/components/emails/components'
import { getEmailTranslator } from '@/components/emails/i18n'
import { getBrandConfig } from '@/ee/whitelabeling'

interface OTPVerificationEmailProps {
  otp: string
  type?: 'sign-in' | 'email-verification' | 'change-email' | 'forget-password' | 'chat-access'
  chatTitle?: string
}

const PREVIEW_KEYS: Record<string, string> = {
  'sign-in': 'subjects.signIn',
  'email-verification': 'subjects.emailVerification',
  'change-email': 'subjects.changeEmail',
  'forget-password': 'subjects.resetPassword',
}

const getSubjectByType = (type: string, brandName: string, chatTitle?: string) => {
  const t = getEmailTranslator()
  const key = PREVIEW_KEYS[type]
  if (key) return t(key, { brandName })
  if (type === 'chat-access') {
    return t('subjects.otp', { resourceLabel: chatTitle || t('otp.chatFallback') })
  }
  return t('subjects.otp', { resourceLabel: brandName })
}

export function OTPVerificationEmail({
  otp,
  type = 'email-verification',
  chatTitle,
}: OTPVerificationEmailProps) {
  const brand = getBrandConfig()
  const t = getEmailTranslator()

  return (
    <EmailLayout preview={getSubjectByType(type, brand.name, chatTitle)} showUnsubscribe={false}>
      <Text style={baseStyles.greeting}>{t('otp.heading')}</Text>

      <Section style={baseStyles.codeContainer}>
        <Text style={baseStyles.code}>{otp}</Text>
      </Section>

      <Text style={baseStyles.paragraph}>{t('otp.expiry')}</Text>

      <div style={baseStyles.divider} />

      <Text style={baseStyles.footnote}>{t('otp.footnote')}</Text>
    </EmailLayout>
  )
}

export default OTPVerificationEmail
