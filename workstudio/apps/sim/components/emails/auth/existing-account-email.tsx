import { Text } from '@react-email/components'
import { baseStyles } from '@/components/emails/_styles'
import { EmailButton, EmailLayout } from '@/components/emails/components'
import { getEmailTranslator } from '@/components/emails/i18n'
import { getBaseUrl } from '@/lib/core/utils/urls'
import { getBrandConfig } from '@/ee/whitelabeling'

interface ExistingAccountEmailProps {
  username?: string
}

/**
 * Sent out-of-band when someone attempts to sign up with an email that already
 * has an account. The sign-up endpoint itself returns a generic success
 * response to avoid account enumeration, so this email is how the real account
 * owner learns of the attempt.
 */
export function ExistingAccountEmail({ username = '' }: ExistingAccountEmailProps) {
  const brand = getBrandConfig()
  const t = getEmailTranslator()
  const loginLink = `${getBaseUrl()}/login`

  return (
    <EmailLayout
      preview={t('existingAccount.preview', { brandName: brand.name })}
      showUnsubscribe={false}
    >
      <Text style={baseStyles.greeting}>{t('common.helloName', { name: username })}</Text>
      <Text style={baseStyles.paragraph}>
        {t('existingAccount.body', { brandName: brand.name })}
      </Text>

      <EmailButton href={loginLink}>{t('existingAccount.signIn')}</EmailButton>

      <div style={baseStyles.divider} />

      <Text style={baseStyles.footnote}>{t('existingAccount.footnote')}</Text>
    </EmailLayout>
  )
}

export default ExistingAccountEmail
