import { Link, Text } from '@react-email/components'
import { baseStyles } from '@/components/emails/_styles'
import { EmailButton, EmailLayout } from '@/components/emails/components'
import { getEmailTranslator } from '@/components/emails/i18n'
import { docsUrl } from '@/lib/branding/docs-url'
import { getBaseUrl } from '@/lib/core/utils/urls'
import { getBrandConfig } from '@/ee/whitelabeling'

interface WelcomeEmailProps {
  userName?: string
}

export function WelcomeEmail({ userName }: WelcomeEmailProps) {
  const brand = getBrandConfig()
  const baseUrl = getBaseUrl()
  const t = getEmailTranslator()

  return (
    <EmailLayout preview={t('subjects.welcome', { brandName: brand.name })} showUnsubscribe={false}>
      <Text style={baseStyles.greeting}>
        {userName ? t('common.heyName', { name: userName }) : t('common.hey')}
      </Text>
      <Text style={baseStyles.paragraph}>{t('welcome.body', { brandName: brand.name })}</Text>

      <EmailButton href={`${baseUrl}/login`}>{t('welcome.getStarted')}</EmailButton>

      <Text style={baseStyles.paragraph}>{t('welcome.feedback')}</Text>

      <Text style={baseStyles.paragraph}>
        {t.rich('welcome.call', {
          link: (chunks) => (
            <Link href={docsUrl()} style={baseStyles.link}>
              {chunks}
            </Link>
          ),
        })}
      </Text>

      <Text style={baseStyles.paragraph}>{t('welcome.signature', { brandName: brand.name })}</Text>

      <div style={baseStyles.divider} />

      <Text style={baseStyles.footnote}>{t('welcome.footnote')}</Text>
    </EmailLayout>
  )
}

export default WelcomeEmail
