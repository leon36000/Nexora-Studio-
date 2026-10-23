import { Text } from '@react-email/components'
import { baseStyles } from '@/components/emails/_styles'
import { EmailButton, EmailLayout } from '@/components/emails/components'
import { getEmailTranslator } from '@/components/emails/i18n'
import { getBrandConfig } from '@/ee/whitelabeling'

interface ResetPasswordEmailProps {
  username?: string
  resetLink?: string
}

export function ResetPasswordEmail({ username = '', resetLink = '' }: ResetPasswordEmailProps) {
  const brand = getBrandConfig()
  const t = getEmailTranslator()

  return (
    <EmailLayout
      preview={t('subjects.resetPassword', { brandName: brand.name })}
      showUnsubscribe={false}
    >
      <Text style={baseStyles.greeting}>{t('common.helloName', { name: username })}</Text>
      <Text style={baseStyles.paragraph}>{t('resetPassword.body', { brandName: brand.name })}</Text>

      <EmailButton href={resetLink}>{t('resetPassword.button')}</EmailButton>

      <div style={baseStyles.divider} />

      <Text style={baseStyles.footnote}>{t('resetPassword.footnote')}</Text>
    </EmailLayout>
  )
}

export default ResetPasswordEmail
