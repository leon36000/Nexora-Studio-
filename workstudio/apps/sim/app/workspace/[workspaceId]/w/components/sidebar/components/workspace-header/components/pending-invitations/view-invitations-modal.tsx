'use client'

import { Fragment } from 'react'
import {
  Chip,
  ChipModal,
  ChipModalBody,
  ChipModalField,
  ChipModalFooter,
  ChipModalHeader,
  ChipModalSeparator,
  ChipTag,
  toast,
} from '@sim/emcn'
import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { IdentityTile } from '@/components/identity-tile/identity-tile'
import type { MyInvitation } from '@/lib/api/contracts/invitations'
import { getInvitationErrorMessage } from '@/lib/invitations/error-messages'
import { getWorkspaceInitial } from '@/lib/workspaces/initials'
import { InvitationDisclosure } from '@/app/invite/components/invitation-disclosure'
import { InvitationWorkspaceAccess } from '@/app/invite/components/invitation-workspace-access'
import {
  SettingsEmptyState,
  SettingsQueryErrorState,
} from '@/app/workspace/[workspaceId]/settings/components/settings-empty-state'
import { SettingsResourceRow } from '@/app/workspace/[workspaceId]/settings/components/settings-resource-row'
import {
  useAcceptMyInvitation,
  useDeclineMyInvitation,
  useMyPendingInvitations,
} from '@/hooks/queries/invitations'

const logger = createLogger('ViewInvitationsModal')

/**
 * Display name for an invitation, mirroring the /invite page: organization
 * invites are labeled by the org (even when workspace grants ride along);
 * workspace invites by their workspace(s).
 */
function invitationLabel(inv: MyInvitation, t: ReturnType<typeof useTranslations>): string {
  if (inv.kind === 'organization') {
    return inv.organizationName ?? t('organizationFallback')
  }
  const first = inv.grants[0]?.workspaceName
  if (first) {
    const extra = inv.grants.length - 1
    return extra > 0 ? `${first} +${extra}` : first
  }
  return t('workspaceFallback')
}

interface ViewInvitationsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * The invitee-facing pending-invitations modal, opened from the workspace
 * switcher's "View invitations" entry. Accepting is session-bound (no token),
 * so it works regardless of which browser the invite email was opened in —
 * including the desktop app. Accepting closes the modal and navigates into
 * the joined workspace; declining keeps it open for the remaining rows.
 */
export function ViewInvitationsModal({ open, onOpenChange }: ViewInvitationsModalProps) {
  const t = useTranslations('shell.invitations')
  const invitationsQuery = useMyPendingInvitations(open)
  const invitations = invitationsQuery.data ?? []
  const acceptInvitation = useAcceptMyInvitation()
  const declineInvitation = useDeclineMyInvitation()
  const router = useRouter()

  const isBusy = acceptInvitation.isPending || declineInvitation.isPending

  const handleAccept = async (inv: MyInvitation) => {
    if (isBusy || (inv.membershipIntent === 'internal' && !inv.joinPreview)) return
    try {
      const result = await acceptInvitation.mutateAsync({
        invitationId: inv.id,
        disclosedWorkspaceIds: inv.joinPreview?.workspaceIdsToMove,
        disclosedOutcome: inv.joinPreview?.outcome,
      })
      toast.success(t('joined', { name: invitationLabel(inv, t) }))
      onOpenChange(false)
      router.push(result.redirectPath)
    } catch (error) {
      logger.error('Failed to accept invitation', { error })
      toast.error(getInvitationErrorMessage(getErrorMessage(error, ''), t('acceptFailed')))
    }
  }

  const handleDecline = async (inv: MyInvitation) => {
    try {
      await declineInvitation.mutateAsync({ invitationId: inv.id })
    } catch (error) {
      logger.error('Failed to decline invitation', { error })
      toast.error(getInvitationErrorMessage(getErrorMessage(error, ''), t('declineFailed')))
    }
  }

  return (
    <ChipModal open={open} onOpenChange={onOpenChange} srTitle={t('pendingTitle')}>
      <ChipModalHeader onClose={() => onOpenChange(false)}>{t('title')}</ChipModalHeader>
      <ChipModalBody>
        {invitationsQuery.isError ? (
          <SettingsQueryErrorState
            error={invitationsQuery.error}
            fallback={t('loadFailed')}
            isRetrying={invitationsQuery.isFetching}
            onRetry={() => void invitationsQuery.refetch()}
            variant='inline'
          />
        ) : invitationsQuery.isPending ? (
          <SettingsEmptyState variant='inline'>{t('loading')}</SettingsEmptyState>
        ) : invitations.length === 0 ? (
          <SettingsEmptyState variant='inline'>{t('empty')}</SettingsEmptyState>
        ) : (
          invitations.map((inv, index) => {
            const isDisclosureMissing = inv.membershipIntent === 'internal' && !inv.joinPreview
            const singleWorkspaceGrant =
              inv.kind === 'workspace' && inv.grants.length === 1 ? inv.grants[0] : null
            const showJoinNotice = inv.joinPreview
              ? inv.joinPreview.outcome !== 'external'
              : inv.membershipIntent === 'internal'
            const showWorkspaceAccess = !singleWorkspaceGrant && inv.grants.length > 0
            const hasDetails = showJoinNotice || showWorkspaceAccess
            const actions = (
              <div className='ml-auto flex shrink-0 gap-2'>
                <Chip
                  disabled={isBusy}
                  onClick={() => void handleDecline(inv)}
                  aria-label={t('declineAria', { name: invitationLabel(inv, t) })}
                >
                  {t('decline')}
                </Chip>
                <Chip
                  variant='primary'
                  disabled={isBusy || isDisclosureMissing}
                  onClick={() => void handleAccept(inv)}
                >
                  {t('accept')}
                </Chip>
              </div>
            )
            return (
              <Fragment key={inv.id}>
                {index > 0 && <ChipModalSeparator />}
                <section
                  aria-label={t('invitationAria', { name: invitationLabel(inv, t) })}
                  className='space-y-4'
                >
                  <div className='flex flex-wrap items-center gap-3 px-2'>
                    <div className='min-w-0 flex-1 basis-[240px]'>
                      <SettingsResourceRow
                        flush
                        icon={
                          singleWorkspaceGrant && (
                            <IdentityTile
                              initial={getWorkspaceInitial(
                                singleWorkspaceGrant.workspaceName ?? undefined
                              )}
                              logoUrl={singleWorkspaceGrant.workspaceLogoUrl}
                            />
                          )
                        }
                        iconVariant='custom'
                        title={invitationLabel(inv, t)}
                        description={
                          inv.inviterName ? t('invitedBy', { name: inv.inviterName }) : t('invited')
                        }
                        badge={
                          singleWorkspaceGrant && (
                            <ChipTag variant='gray'>
                              {t('permissionAccess', {
                                permission: t(`permissions.${singleWorkspaceGrant.permission}`),
                              })}
                            </ChipTag>
                          )
                        }
                      />
                    </div>
                    {!hasDetails && actions}
                  </div>
                  {showJoinNotice && (
                    <ChipModalField type='custom' title={t('beforeYouJoin')}>
                      <InvitationDisclosure
                        invitation={inv}
                        joinPreview={inv.joinPreview}
                        showWorkspaceAccess={false}
                      />
                      {isDisclosureMissing && (
                        <Chip
                          disabled={isBusy || invitationsQuery.isFetching}
                          onClick={() => void invitationsQuery.refetch()}
                        >
                          {t('refresh')}
                        </Chip>
                      )}
                    </ChipModalField>
                  )}
                  {showWorkspaceAccess && (
                    <ChipModalField type='custom' title={t('workspaceAccess')}>
                      <InvitationWorkspaceAccess grants={inv.grants} />
                    </ChipModalField>
                  )}
                  {hasDetails && <div className='flex px-2'>{actions}</div>}
                </section>
              </Fragment>
            )
          })
        )}
      </ChipModalBody>
      {invitations.length === 0 && (
        <ChipModalFooter
          defaultAction='dismiss'
          cancelLabel={t('done')}
          onCancel={() => onOpenChange(false)}
        />
      )}
    </ChipModal>
  )
}
