import { useTranslations } from 'next-intl'
import type { InvitationDetails, MyInvitation } from '@/lib/api/contracts/invitations'
import { InvitationWorkspaceAccess } from '@/app/invite/components/invitation-workspace-access'

interface InvitationDisclosureProps {
  invitation: InvitationDetails
  joinPreview: MyInvitation['joinPreview']
  showWorkspaceAccess?: boolean
}

export function InvitationDisclosure({
  invitation,
  joinPreview,
  showWorkspaceAccess = true,
}: InvitationDisclosureProps) {
  const t = useTranslations('auth.invite.disclosure')
  const outcome =
    joinPreview?.outcome ?? (invitation.membershipIntent === 'external' ? 'external' : null)
  const organizationName =
    joinPreview?.organizationName ??
    (invitation.kind === 'organization' ? invitation.organizationName : null) ??
    t('organizationFallback')
  const roleLabel = t.has(`roles.${invitation.role}`)
    ? t(`roles.${invitation.role}`)
    : invitation.role

  return (
    <div className='space-y-3 text-left text-[var(--text-body)] text-small'>
      {outcome === 'will-join' && (
        <>
          <p>
            {t.rich('willJoin', {
              organizationName,
              role: roleLabel,
              strong: (chunks) => <strong className='font-medium'>{chunks}</strong>,
            })}
          </p>
          {joinPreview && joinPreview.workspaceIdsToMove.length > 0 ? (
            <div>
              <p>{t('workspacesMove')}</p>
              <ul className='mt-1 list-disc space-y-1 pl-5' aria-label={t('workspacesMovingAria')}>
                {joinPreview.workspaceIdsToMove.map((id, index) => (
                  <li key={id} className='break-words'>
                    {joinPreview.workspacesToMove[index] || t('unnamedWorkspace')}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p>{t('noWorkspacesToMove')}</p>
          )}
        </>
      )}
      {outcome === 'already-member' && <p>{t('alreadyMember')}</p>}
      {outcome === 'blocked' && <p>{t('blocked')}</p>}
      {outcome === null && <p>{t('unavailable')}</p>}
      {showWorkspaceAccess && invitation.grants.length > 0 && (
        <div className='space-y-2'>
          <p className='text-[var(--text-muted)] text-caption'>{t('workspaceAccess')}</p>
          <InvitationWorkspaceAccess grants={invitation.grants} />
        </div>
      )}
    </div>
  )
}
