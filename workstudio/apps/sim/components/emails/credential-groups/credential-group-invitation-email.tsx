import { Link, Text } from '@react-email/components'
import { baseStyles } from '@/components/emails/_styles'
import { EmailLayout } from '@/components/emails/components'
import { getEmailTranslator } from '@/components/emails/i18n'
import { getBrandConfig } from '@/ee/whitelabeling'

interface CredentialGroupInvitationEmailProps {
  recipientEmail: string
  /** Absent when a workflow issued the invitation: there is no person to name. */
  inviterName?: string
  workspaceName: string
  credentialGroupName: string
  invitationLink: string
  searchProviderName?: string
}

export function CredentialGroupInvitationEmail({
  recipientEmail,
  inviterName,
  workspaceName,
  credentialGroupName,
  invitationLink,
  searchProviderName,
}: CredentialGroupInvitationEmailProps) {
  const brand = getBrandConfig()
  const t = getEmailTranslator()
  const bodyKey = `credentialGroupInvitation.${searchProviderName ? 'search' : 'group'}${inviterName ? 'From' : ''}`

  return (
    <EmailLayout
      preview={
        inviterName
          ? t('credentialGroupInvitation.previewFrom', { inviterName, workspaceName })
          : t('credentialGroupInvitation.preview', { workspaceName })
      }
      showUnsubscribe={false}
    >
      <Text style={baseStyles.paragraph}>{t('common.hello')}</Text>
      <Text style={baseStyles.paragraph}>
        {t.rich(bodyKey, {
          inviterName: inviterName ?? '',
          recipientEmail,
          providerName: searchProviderName ?? '',
          groupName: credentialGroupName,
          workspaceName,
          brandName: brand.name,
          strong: (chunks) => <strong>{chunks}</strong>,
        })}
      </Text>
      {searchProviderName && (
        <Text style={baseStyles.paragraph}>{t('credentialGroupInvitation.searchNote')}</Text>
      )}

      <Link href={invitationLink} style={{ textDecoration: 'none' }}>
        <Text style={baseStyles.button}>
          {searchProviderName
            ? t('credentialGroupInvitation.connectProvider', { providerName: searchProviderName })
            : t('credentialGroupInvitation.connectAccounts')}
        </Text>
      </Link>

      <div style={baseStyles.divider} />

      <Text style={{ ...baseStyles.footerText, textAlign: 'left' }}>
        {t('credentialGroupInvitation.footnote', { brandName: brand.name })}
      </Text>
    </EmailLayout>
  )
}

export default CredentialGroupInvitationEmail
