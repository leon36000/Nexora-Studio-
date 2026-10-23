import { ChipTag } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import { IdentityTile } from '@/components/identity-tile/identity-tile'
import type { InvitationDetails } from '@/lib/api/contracts/invitations'
import { getWorkspaceInitial } from '@/lib/workspaces/initials'
import { SettingsResourceRow } from '@/app/workspace/[workspaceId]/settings/components/settings-resource-row'

interface InvitationWorkspaceAccessProps {
  grants: InvitationDetails['grants']
}

export function InvitationWorkspaceAccess({ grants }: InvitationWorkspaceAccessProps) {
  const t = useTranslations('auth.invite.disclosure')
  const accessLabel = (permission: string) =>
    t.has(`permissionAccess.${permission}`)
      ? t(`permissionAccess.${permission}`)
      : `${permission} access`

  return (
    <ul className='space-y-2' aria-label={t('invitedAccessAria')}>
      {grants.map((grant) => (
        <li key={grant.workspaceId}>
          <SettingsResourceRow
            flush
            icon={
              <IdentityTile
                initial={getWorkspaceInitial(grant.workspaceName ?? undefined)}
                logoUrl={grant.workspaceLogoUrl}
              />
            }
            iconVariant='custom'
            title={grant.workspaceName || t('unnamedWorkspace')}
            badge={<ChipTag variant='gray'>{accessLabel(grant.permission)}</ChipTag>}
          />
        </li>
      ))}
    </ul>
  )
}
