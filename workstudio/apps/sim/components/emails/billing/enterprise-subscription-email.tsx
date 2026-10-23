import { Link, Section, Text } from '@react-email/components'
import { baseStyles } from '@/components/emails/_styles'
import { EmailButton, EmailLayout, EmailStrong } from '@/components/emails/components'
import { getEmailTranslator } from '@/components/emails/i18n'
import { getBaseUrl } from '@/lib/core/utils/urls'
import { getBrandConfig } from '@/ee/whitelabeling'

interface EnterpriseSubscriptionEmailProps {
  userName?: string
  loginLink?: string
}

export function EnterpriseSubscriptionEmail({
  userName,
  loginLink,
}: EnterpriseSubscriptionEmailProps) {
  const brand = getBrandConfig()
  const baseUrl = getBaseUrl()
  const t = getEmailTranslator()
  const effectiveLoginLink = loginLink || `${baseUrl}/login`

  return (
    <EmailLayout
      preview={t('subjects.enterpriseSubscription', { brandName: brand.name })}
      showUnsubscribe={false}
    >
      <Text style={baseStyles.greeting}>
        {t('common.helloName', { name: userName ?? t('enterpriseSubscription.defaultName') })}
      </Text>
      <Text style={baseStyles.paragraph}>
        {t.rich('enterpriseSubscription.body', {
          strong: (chunks) => <EmailStrong>{chunks}</EmailStrong>,
        })}
      </Text>

      <Section style={baseStyles.infoBox}>
        <Text style={baseStyles.infoBoxTitle}>{t('enterpriseSubscription.nextSteps')}</Text>
        <Text style={baseStyles.infoBoxList}>
          {t('enterpriseSubscription.inviteTeammates')}
          <br />
          {t('enterpriseSubscription.startBuilding')}
        </Text>
      </Section>

      <EmailButton href={effectiveLoginLink}>
        {t('common.openBrand', { brandName: brand.name })}
      </EmailButton>

      <div style={baseStyles.divider} />

      <Text style={baseStyles.footnote}>
        {t.rich('enterpriseSubscription.footnote', {
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

export default EnterpriseSubscriptionEmail
