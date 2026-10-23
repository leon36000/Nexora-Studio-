import { Text } from '@react-email/components'
import { baseStyles } from '@/components/emails/_styles'
import { EmailButton, EmailLayout, EmailStrong } from '@/components/emails/components'
import { getEmailTranslator } from '@/components/emails/i18n'
import { getBrandConfig } from '@/ee/whitelabeling'

interface EnterpriseOwnerInvitationEmailProps {
  organizationName: string
  inviteLink: string
  expiresInDays: number
}

export function EnterpriseOwnerInvitationEmail({
  organizationName,
  inviteLink,
  expiresInDays,
}: EnterpriseOwnerInvitationEmailProps) {
  const brand = getBrandConfig()
  const t = getEmailTranslator()
  return (
    <EmailLayout
      preview={t('enterpriseOwnerInvitation.preview', {
        organizationName,
        brandName: brand.name,
      })}
      showUnsubscribe={false}
    >
      <Text style={baseStyles.greeting}>{t('common.hello')}</Text>
      <Text style={baseStyles.paragraph}>
        {t.rich('enterpriseOwnerInvitation.selected', {
          organizationName,
          brandName: brand.name,
          strong: (chunks) => <EmailStrong>{chunks}</EmailStrong>,
        })}
      </Text>
      <Text style={baseStyles.paragraph}>{t('enterpriseOwnerInvitation.review')}</Text>
      <EmailButton href={inviteLink}>{t('enterpriseOwnerInvitation.button')}</EmailButton>
      <div style={baseStyles.divider} />
      <Text style={baseStyles.footnote}>
        {t('enterpriseOwnerInvitation.footnote', { days: String(expiresInDays) })}
      </Text>
    </EmailLayout>
  )
}
