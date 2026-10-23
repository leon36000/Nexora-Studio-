import { Link, Text } from '@react-email/components'
import { baseStyles } from '@/components/emails/_styles'
import { EmailButton, EmailLayout, EmailStrong } from '@/components/emails/components'
import { getEmailTranslator } from '@/components/emails/i18n'
import { getBaseUrl } from '@/lib/core/utils/urls'
import { getBrandConfig } from '@/ee/whitelabeling'

interface PlanWelcomeEmailProps {
  planName: string
  userName?: string
  loginLink?: string
}

export function PlanWelcomeEmail({ planName, userName, loginLink }: PlanWelcomeEmailProps) {
  const brand = getBrandConfig()
  const baseUrl = getBaseUrl()
  const t = getEmailTranslator()
  const cta = loginLink || `${baseUrl}/login`

  return (
    <EmailLayout
      preview={t('planWelcome.preview', { brandName: brand.name, planName })}
      showUnsubscribe={true}
    >
      <Text style={baseStyles.greeting}>
        {userName ? t('common.hiName', { name: userName }) : t('common.hi')}
      </Text>
      <Text style={baseStyles.paragraph}>
        {t.rich('planWelcome.body', {
          planName,
          strong: (chunks) => <EmailStrong>{chunks}</EmailStrong>,
        })}
      </Text>

      <EmailButton href={cta}>{t('common.openBrand', { brandName: brand.name })}</EmailButton>

      <Text style={baseStyles.paragraph}>
        {t.rich('planWelcome.call', {
          link: (chunks) => (
            <Link href={`${baseUrl}/team`} style={baseStyles.link}>
              {chunks}
            </Link>
          ),
        })}
      </Text>

      <div style={baseStyles.divider} />

      <Text style={baseStyles.footnote}>{t('planWelcome.footnote')}</Text>
    </EmailLayout>
  )
}

export default PlanWelcomeEmail
