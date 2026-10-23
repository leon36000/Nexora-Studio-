import { Text } from '@react-email/components'
import { baseStyles } from '@/components/emails/_styles'
import { EmailButton, EmailLayout, EmailStrong } from '@/components/emails/components'
import { getEmailTranslator } from '@/components/emails/i18n'
import { getBrandConfig } from '@/ee/whitelabeling'

interface WorkspaceAddedEmailProps {
  /** Name of the workspace the recipient was added to. */
  workspaceName?: string
  /** Name of the person who added the recipient. */
  inviterName?: string
  /** Direct link to the workspace (no acceptance required). */
  workspaceLink?: string
}

export function WorkspaceAddedEmail({
  workspaceName,
  inviterName,
  workspaceLink = '',
}: WorkspaceAddedEmailProps) {
  const brand = getBrandConfig()
  const t = getEmailTranslator()
  const workspace = workspaceName ?? t('workspaceAdded.defaultWorkspace')
  const inviter = inviterName ?? t('workspaceAdded.defaultInviter')

  return (
    <EmailLayout
      preview={t('workspaceAdded.preview', { workspaceName: workspace, brandName: brand.name })}
      showUnsubscribe={false}
    >
      <Text style={baseStyles.greeting}>{t('common.hello')}</Text>
      <Text style={baseStyles.paragraph}>
        {t.rich('workspaceAdded.body', {
          inviterName: inviter,
          workspaceName: workspace,
          brandName: brand.name,
          strong: (chunks) => <EmailStrong>{chunks}</EmailStrong>,
        })}
      </Text>

      <EmailButton href={workspaceLink}>{t('workspaceAdded.button')}</EmailButton>

      <div style={baseStyles.divider} />

      <Text style={baseStyles.footnote}>{t('workspaceAdded.footnote')}</Text>
    </EmailLayout>
  )
}

export default WorkspaceAddedEmail
