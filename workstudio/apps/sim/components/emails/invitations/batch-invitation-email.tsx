import { Fragment } from 'react'
import { Section, Text } from '@react-email/components'
import { baseStyles } from '@/components/emails/_styles'
import { EmailButton, EmailLayout, EmailStrong } from '@/components/emails/components'
import { getEmailTranslator } from '@/components/emails/i18n'
import { getBrandConfig } from '@/ee/whitelabeling'

interface WorkspaceInvitation {
  workspaceId: string
  workspaceName: string
  permission: 'admin' | 'write' | 'read'
}

interface BatchInvitationEmailProps {
  inviterName: string
  organizationName: string
  organizationRole: 'admin' | 'member'
  workspaceInvitations: WorkspaceInvitation[]
  acceptUrl: string
}

const PERMISSIONS = new Set(['admin', 'write', 'read'])
const ROLES = new Set(['admin', 'member'])

const EMPTY_INVITATIONS: WorkspaceInvitation[] = []

export function BatchInvitationEmail({
  inviterName,
  organizationName,
  organizationRole = 'member',
  workspaceInvitations = EMPTY_INVITATIONS,
  acceptUrl,
}: BatchInvitationEmailProps) {
  const brand = getBrandConfig()
  const t = getEmailTranslator()
  const inviter = inviterName ?? t('batchInvitation.defaultInviter')
  const organization = organizationName ?? t('batchInvitation.defaultOrganization')
  const hasWorkspaces = workspaceInvitations.length > 0
  const permissionLabel = (permission: string) =>
    PERMISSIONS.has(permission) ? t(`batchInvitation.permissions.${permission}`) : permission
  const roleLabel = ROLES.has(organizationRole)
    ? t(`batchInvitation.roles.${organizationRole}`)
    : organizationRole

  return (
    <EmailLayout
      preview={
        hasWorkspaces
          ? t('batchInvitation.previewWithWorkspaces', {
              organizationName: organization,
              count: String(workspaceInvitations.length),
            })
          : t('batchInvitation.preview', { organizationName: organization })
      }
      showUnsubscribe={false}
    >
      <Text style={baseStyles.greeting}>{t('common.hello')}</Text>
      <Text style={baseStyles.paragraph}>
        {t.rich('batchInvitation.body', {
          inviterName: inviter,
          organizationName: organization,
          brandName: brand.name,
          strong: (chunks) => <EmailStrong>{chunks}</EmailStrong>,
        })}
      </Text>

      <Section style={baseStyles.infoBox}>
        <Text style={baseStyles.infoBoxTitle}>{t('batchInvitation.teamRole')}</Text>
        <Text style={baseStyles.infoBoxList}>
          {roleLabel} —{' '}
          {organizationRole === 'admin'
            ? t('batchInvitation.adminDetail')
            : t('batchInvitation.memberDetail')}
        </Text>
      </Section>

      {hasWorkspaces && (
        <Section style={baseStyles.infoBox}>
          <Text style={baseStyles.infoBoxTitle}>
            {t('batchInvitation.workspaceAccess', { count: workspaceInvitations.length })}
          </Text>
          <Text style={baseStyles.infoBoxList}>
            {workspaceInvitations.map((ws, index) => (
              <Fragment key={ws.workspaceId}>
                {index > 0 && <br />}
                {ws.workspaceName} — {permissionLabel(ws.permission)}
              </Fragment>
            ))}
          </Text>
        </Section>
      )}

      <EmailButton href={acceptUrl}>{t('common.acceptInvitation')}</EmailButton>

      <div style={baseStyles.divider} />

      <Text style={baseStyles.footnote}>{t('common.expiresIn7Days')}</Text>
    </EmailLayout>
  )
}

export default BatchInvitationEmail
