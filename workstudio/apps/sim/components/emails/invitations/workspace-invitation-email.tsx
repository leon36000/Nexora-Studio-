import { Fragment } from 'react'
import { Text } from '@react-email/components'
import { baseStyles } from '@/components/emails/_styles'
import { EmailButton, EmailLayout, EmailStrong } from '@/components/emails/components'
import { EMAIL_DATE_LOCALE, EMAIL_LOCALE, getEmailTranslator } from '@/components/emails/i18n'
import { getBrandConfig } from '@/ee/whitelabeling'

interface WorkspaceInvitationEmailProps {
  /** Workspaces this invitation grants access to (one entry per workspace). */
  workspaceNames?: string[]
  inviterName?: string
  invitationLink?: string
}

/** Joins the names the way the email language writes a list, each name in bold. */
function WorkspaceNameList({ names }: { names: string[] }) {
  const parts = new Intl.ListFormat(EMAIL_DATE_LOCALE[EMAIL_LOCALE], {
    style: 'long',
    type: 'conjunction',
  }).formatToParts(names)
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={`${part.value}-${index}`}>
          {part.type === 'element' ? <EmailStrong>{part.value}</EmailStrong> : part.value}
        </Fragment>
      ))}
    </>
  )
}

export function WorkspaceInvitationEmail({
  workspaceNames,
  inviterName,
  invitationLink = '',
}: WorkspaceInvitationEmailProps) {
  const brand = getBrandConfig()
  const t = getEmailTranslator()
  const names = workspaceNames ?? [t('workspaceInvitation.defaultWorkspace')]
  const inviter = inviterName ?? t('workspaceInvitation.defaultInviter')
  const isMultiple = names.length > 1
  const preview = isMultiple
    ? t('workspaceInvitation.previewMultiple', {
        count: String(names.length),
        brandName: brand.name,
      })
    : t('workspaceInvitation.previewSingle', { workspaceName: names[0], brandName: brand.name })

  return (
    <EmailLayout preview={preview} showUnsubscribe={false}>
      <Text style={baseStyles.greeting}>{t('common.hello')}</Text>
      <Text style={baseStyles.paragraph}>
        {t.rich(
          isMultiple ? 'workspaceInvitation.bodyMultiple' : 'workspaceInvitation.bodySingle',
          {
            inviterName: inviter,
            brandName: brand.name,
            strong: (chunks) => <EmailStrong>{chunks}</EmailStrong>,
            workspaces: () => <WorkspaceNameList names={names} />,
          }
        )}
      </Text>

      <EmailButton href={invitationLink}>{t('common.acceptInvitation')}</EmailButton>

      <div style={baseStyles.divider} />

      <Text style={baseStyles.footnote}>{t('common.expiresIn7Days')}</Text>
    </EmailLayout>
  )
}

export default WorkspaceInvitationEmail
