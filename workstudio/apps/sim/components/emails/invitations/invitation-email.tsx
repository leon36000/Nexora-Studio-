import { Text } from '@react-email/components'
import { createLogger } from '@sim/logger'
import { baseStyles } from '@/components/emails/_styles'
import { EmailButton, EmailLayout, EmailStrong } from '@/components/emails/components'
import { getEmailTranslator } from '@/components/emails/i18n'
import { getBaseUrl } from '@/lib/core/utils/urls'
import { getBrandConfig } from '@/ee/whitelabeling'

interface InvitationEmailProps {
  inviterName?: string
  organizationName?: string
  inviteLink?: string
}

const logger = createLogger('InvitationEmail')

export function InvitationEmail({
  inviterName,
  organizationName,
  inviteLink = '',
}: InvitationEmailProps) {
  const brand = getBrandConfig()
  const baseUrl = getBaseUrl()
  const t = getEmailTranslator()
  const inviter = inviterName ?? t('invitation.defaultInviter')
  const organization = organizationName ?? t('invitation.defaultOrganization')

  let enhancedLink = inviteLink

  if (inviteLink && !inviteLink.includes('token=')) {
    try {
      const url = new URL(inviteLink)
      const invitationId = url.pathname.split('/').pop()
      if (invitationId) {
        enhancedLink = `${baseUrl}/invite/${invitationId}?token=${invitationId}`
      }
    } catch (e) {
      logger.error('Error parsing invite link:', e)
    }
  }

  return (
    <EmailLayout
      preview={t('invitation.preview', { organizationName: organization, brandName: brand.name })}
      showUnsubscribe={false}
    >
      <Text style={baseStyles.greeting}>{t('common.hello')}</Text>
      <Text style={baseStyles.paragraph}>
        {t.rich('invitation.body', {
          inviterName: inviter,
          organizationName: organization,
          brandName: brand.name,
          strong: (chunks) => <EmailStrong>{chunks}</EmailStrong>,
        })}
      </Text>

      <EmailButton href={enhancedLink}>{t('common.acceptInvitation')}</EmailButton>

      <div style={baseStyles.divider} />

      <Text style={baseStyles.footnote}>{t('invitation.footnote')}</Text>
    </EmailLayout>
  )
}

export default InvitationEmail
