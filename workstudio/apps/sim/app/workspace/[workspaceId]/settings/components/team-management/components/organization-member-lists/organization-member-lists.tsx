'use client'

import { useMemo, useState } from 'react'
import { ChipDropdown, ChipTag, toast } from '@sim/emcn'
import { createLogger } from '@sim/logger'
import { isOrgAdminRole } from '@sim/platform-authz/predicates'
import { getErrorMessage } from '@sim/utils/errors'
import { formatDate } from '@sim/utils/formatting'
import { useTranslations } from 'next-intl'
import {
  type OrgRole,
  type PermissionType,
  RoleLockTooltip,
  workspaceRoleLockReason,
} from '@/components/permissions'
import type {
  OrganizationRoster,
  RosterMember,
  RosterPendingInvitation,
  RosterWorkspaceAccess,
} from '@/lib/api/contracts/organization'
import type { Member } from '@/lib/workspaces/organization'
import {
  ManageCreditsModal,
  type ManageCreditsTarget,
} from '@/app/workspace/[workspaceId]/settings/components/manage-credits-modal'
import {
  MemberRow,
  MemberSection,
} from '@/app/workspace/[workspaceId]/settings/components/member-list'
import {
  type RowAction,
  RowActionsMenu,
} from '@/app/workspace/[workspaceId]/settings/components/row-actions-menu'
import {
  useRemoveWorkspaceMember,
  useUpdateWorkspacePermissions,
} from '@/hooks/queries/invitations'
import {
  useCancelInvitation,
  useResendInvitation,
  useUpdateInvitation,
  useUpdateOrganizationMemberRole,
} from '@/hooks/queries/organization'

const logger = createLogger('OrganizationMemberLists')

const ORG_ROLE_VALUES = ['admin', 'member'] as const

const WORKSPACE_ROLE_VALUES = ['read', 'write', 'admin'] as const

const TRANSLATED_ORG_ROLES = new Set(['owner', 'admin', 'member', 'external'])

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function copyToClipboard(text: string) {
  void navigator.clipboard.writeText(text)
}

interface OrganizationMemberListsProps {
  canManage: boolean
  organizationId: string
  roster: OrganizationRoster | null | undefined
  isLoadingRoster: boolean
  currentUserId: string
  /**
   * The roster filter, owned by the page so it can live in the URL — this
   * component renders the shared `SettingsPanel` search box's results, it does
   * not own the box.
   */
  query: string
  onRemoveMember: (member: Member) => void
  onTransferOwnership?: () => void
}

/**
 * Renders the organization roster as Teammates-style sections: an org-level
 * "Members" section followed by one section per workspace, each listing that
 * workspace's members and pending grants. A single search box filters every
 * section; sections with no matches collapse while a search is active.
 */
export function OrganizationMemberLists({
  canManage,
  organizationId,
  roster,
  isLoadingRoster,
  currentUserId,
  query,
  onRemoveMember,
  onTransferOwnership,
}: OrganizationMemberListsProps) {
  const t = useTranslations('settings.teamManagement.memberLists')
  const tShared = useTranslations('settings.shared')
  const orgRoleOptions = ORG_ROLE_VALUES.map((value) => ({
    value,
    label: t(`orgRoles.${value}`),
  }))
  const workspaceRoleOptions = WORKSPACE_ROLE_VALUES.map((value) => ({
    value,
    label: t(`workspaceRoles.${value}`),
  }))
  const orgRoleLabel = (role: string) =>
    TRANSLATED_ORG_ROLES.has(role) ? t(`orgRoles.${role}`) : capitalize(role)
  const buildActionsMenu = (actions: RowAction[]) => (
    <RowActionsMenu label={t('memberActions')} actions={actions} />
  )
  const memberStatus = (member: RosterMember) =>
    member.suspendedAt
      ? t('deactivatedByDirectory')
      : t('joined', { date: formatDate(new Date(member.createdAt)) })
  const [creditsTarget, setCreditsTarget] = useState<ManageCreditsTarget | null>(null)

  const updateMemberRole = useUpdateOrganizationMemberRole()
  const updateInvitation = useUpdateInvitation()
  const updatePermissions = useUpdateWorkspacePermissions()
  const removeWorkspaceMember = useRemoveWorkspaceMember()
  const cancelInvitation = useCancelInvitation()
  const resendInvitation = useResendInvitation()

  const members = useMemo(() => roster?.members ?? [], [roster])
  const pendingInvitations = useMemo(() => roster?.pendingInvitations ?? [], [roster])
  const workspaces = useMemo(() => roster?.workspaces ?? [], [roster])

  const q = query.trim().toLowerCase()
  const matches = (name: string, email: string) =>
    !q || name.toLowerCase().includes(q) || email.toLowerCase().includes(q)

  const isActiveSearch = q.length > 0

  const renderOrgMemberRow = (member: RosterMember) => {
    const isSelf = member.userId === currentUserId
    const isOwner = member.role === 'owner'
    const isExternal = member.role === 'external'
    const editable = canManage && !isSelf && !isOwner && !isExternal
    const canRemove = canManage && !isSelf && !isOwner

    return (
      <MemberRow
        key={`org-member-${member.memberId}`}
        name={member.name}
        email={member.email}
        image={member.image}
        status={memberStatus(member)}
        roleControl={
          editable ? (
            <ChipDropdown
              value={member.role}
              onChange={(role) =>
                updateMemberRole
                  .mutateAsync({
                    orgId: organizationId,
                    userId: member.userId,
                    role: role as OrgRole,
                  })
                  .catch((error) => logger.error('Failed to update member role', { error }))
              }
              options={orgRoleOptions}
              matchTriggerWidth={false}
              disabled={updateMemberRole.isPending}
            />
          ) : (
            <ChipTag variant='mono'>{orgRoleLabel(member.role)}</ChipTag>
          )
        }
        menu={buildActionsMenu([
          { label: t('copyEmail'), onSelect: () => copyToClipboard(member.email) },
          ...(canManage && !isOwner
            ? [
                {
                  label: t('manageCredits'),
                  onSelect: () =>
                    setCreditsTarget({
                      userId: member.userId,
                      name: member.name,
                      email: member.email,
                    }),
                },
              ]
            : []),
          ...(canRemove
            ? [
                {
                  label: tShared('remove'),
                  destructive: true,
                  onSelect: () =>
                    onRemoveMember({
                      id: member.memberId,
                      role: member.role,
                      user: {
                        id: member.userId,
                        name: member.name,
                        email: member.email,
                        image: member.image,
                      },
                    }),
                },
              ]
            : []),
          ...(isSelf && isOwner && onTransferOwnership
            ? [{ label: t('transferOwnership'), onSelect: () => onTransferOwnership() }]
            : []),
          ...(canManage && isSelf && !isOwner
            ? [
                {
                  label: t('leaveOrganization'),
                  destructive: true,
                  onSelect: () =>
                    onRemoveMember({
                      id: member.memberId,
                      role: member.role,
                      user: {
                        id: member.userId,
                        name: member.name,
                        email: member.email,
                        image: member.image,
                      },
                    }),
                },
              ]
            : []),
        ])}
      />
    )
  }

  const renderInviteRow = (
    invitation: RosterPendingInvitation,
    keyPrefix: string,
    roleControl: React.ReactNode
  ) => (
    <MemberRow
      key={`${keyPrefix}-${invitation.id}`}
      name={invitation.inviteeName ?? invitation.email}
      email={invitation.email}
      image={invitation.inviteeImage}
      status={t('invitePending')}
      roleControl={roleControl}
      menu={buildActionsMenu([
        { label: t('copyEmail'), onSelect: () => copyToClipboard(invitation.email) },
        ...(canManage
          ? [
              {
                label: t('resendInvite'),
                onSelect: () =>
                  resendInvitation
                    .mutateAsync({ invitationId: invitation.id, orgId: organizationId })
                    .catch((error) => logger.error('Failed to resend invitation', { error })),
              },
              {
                label: t('revokeInvite'),
                destructive: true,
                onSelect: () =>
                  cancelInvitation
                    .mutateAsync({ invitationId: invitation.id, orgId: organizationId })
                    .catch((error) => logger.error('Failed to revoke invitation', { error })),
              },
            ]
          : []),
      ])}
    />
  )

  const renderOrgInviteRow = (invitation: RosterPendingInvitation) => {
    const isExternal = invitation.membershipIntent === 'external'
    const roleControl =
      isExternal || !canManage ? (
        <ChipTag variant='mono'>
          {isExternal
            ? t('orgRoles.external')
            : invitation.role === 'admin'
              ? t('orgRoles.admin')
              : t('orgRoles.member')}
        </ChipTag>
      ) : (
        <ChipDropdown
          value={invitation.role === 'admin' ? 'admin' : 'member'}
          onChange={(role) =>
            updateInvitation
              .mutateAsync({
                orgId: organizationId,
                invitationId: invitation.id,
                role: role as OrgRole,
              })
              .catch((error) => logger.error('Failed to update invitation role', { error }))
          }
          options={orgRoleOptions}
          matchTriggerWidth={false}
          disabled={updateInvitation.isPending}
        />
      )
    return renderInviteRow(invitation, 'org-invite', roleControl)
  }

  const renderWorkspaceMemberRow = (
    member: RosterMember,
    workspaceId: string,
    access: RosterWorkspaceAccess
  ) => {
    const isSelf = member.userId === currentUserId
    const wouldDemoteSelf = isSelf && access.permission === 'admin'
    /**
     * Every reason here has a matching server guard, so a locked control is one
     * the route would have refused. Derived from the roster payload rather than
     * from the org role alone, which missed the workspace owner and the billing
     * account.
     */
    const lockReason = workspaceRoleLockReason(access.roleSource, {
      isBilledAccount: access.isBilledAccount,
    })
    const disabled =
      !canManage || lockReason !== null || wouldDemoteSelf || updatePermissions.isPending
    const canRemoveFromWorkspace = canManage && !isOrgAdminRole(member.role) && !isSelf

    return (
      <MemberRow
        key={`ws-${workspaceId}-member-${member.memberId}`}
        name={member.name}
        email={member.email}
        image={member.image}
        status={memberStatus(member)}
        roleControl={
          <RoleLockTooltip reason={lockReason}>
            <ChipDropdown
              value={access.permission}
              onChange={(permission) =>
                updatePermissions
                  .mutateAsync({
                    workspaceId,
                    organizationId,
                    updates: [{ userId: member.userId, permissions: permission as PermissionType }],
                  })
                  .catch((error) =>
                    logger.error('Failed to update workspace permission', { error })
                  )
              }
              options={workspaceRoleOptions}
              matchTriggerWidth={false}
              disabled={disabled}
            />
          </RoleLockTooltip>
        }
        menu={buildActionsMenu([
          { label: t('copyEmail'), onSelect: () => copyToClipboard(member.email) },
          ...(canRemoveFromWorkspace
            ? [
                {
                  label: t('removeFromWorkspace'),
                  destructive: true,
                  onSelect: () =>
                    removeWorkspaceMember
                      .mutateAsync({ userId: member.userId, workspaceId, organizationId })
                      .catch((error) => {
                        logger.error('Failed to remove workspace member', { error })
                        toast.error(t('removeMemberFailed'), {
                          description: getErrorMessage(error, t('tryAgain')),
                        })
                      }),
                },
              ]
            : []),
        ])}
      />
    )
  }

  const renderWorkspaceInviteRow = (
    invitation: RosterPendingInvitation,
    workspaceId: string,
    access: RosterWorkspaceAccess
  ) => {
    const roleControl = (
      <ChipDropdown
        value={access.permission}
        onChange={(permission) =>
          updateInvitation
            .mutateAsync({
              orgId: organizationId,
              invitationId: invitation.id,
              grants: [{ workspaceId, permission: permission as PermissionType }],
            })
            .catch((error) => logger.error('Failed to update invitation grant', { error }))
        }
        options={workspaceRoleOptions}
        matchTriggerWidth={false}
        disabled={!canManage || updateInvitation.isPending}
      />
    )
    return renderInviteRow(invitation, `ws-${workspaceId}-invite`, roleControl)
  }

  const filteredOrgMembers = members.filter((m) => matches(m.name, m.email))
  const orgPending = pendingInvitations.filter((inv) => inv.kind === 'organization')
  const filteredOrgPending = orgPending.filter((inv) =>
    matches(inv.inviteeName ?? inv.email, inv.email)
  )
  const orgRowCount = members.length + orgPending.length
  const hasOrgMatches = filteredOrgMembers.length + filteredOrgPending.length > 0
  const showMembersSection = !isActiveSearch || hasOrgMatches

  /**
   * Group each workspace's members and pending invites once per roster change.
   * Indexed by a single pass over the roster rather than a `.find` per
   * workspace × member — that inner scan made this O(workspaces × members ×
   * access-entries). Members are appended in roster order, so each group keeps
   * the same ordering the per-workspace scan produced.
   */
  const workspaceGroups = useMemo(() => {
    const membersByWorkspace = new Map<
      string,
      { member: RosterMember; access: RosterWorkspaceAccess }[]
    >()
    for (const member of members) {
      const seen = new Set<string>()
      for (const access of member.workspaces) {
        if (seen.has(access.workspaceId)) continue
        seen.add(access.workspaceId)
        const entries = membersByWorkspace.get(access.workspaceId)
        if (entries) entries.push({ member, access })
        else membersByWorkspace.set(access.workspaceId, [{ member, access }])
      }
    }

    const invitesByWorkspace = new Map<
      string,
      { invitation: RosterPendingInvitation; access: RosterWorkspaceAccess }[]
    >()
    for (const invitation of pendingInvitations) {
      const seen = new Set<string>()
      for (const access of invitation.workspaces) {
        if (seen.has(access.workspaceId)) continue
        seen.add(access.workspaceId)
        const entries = invitesByWorkspace.get(access.workspaceId)
        if (entries) entries.push({ invitation, access })
        else invitesByWorkspace.set(access.workspaceId, [{ invitation, access }])
      }
    }

    return workspaces.map((workspace) => ({
      workspace,
      workspaceMembers: membersByWorkspace.get(workspace.id) ?? [],
      workspaceInvites: invitesByWorkspace.get(workspace.id) ?? [],
    }))
  }, [workspaces, members, pendingInvitations])

  return (
    <>
      {showMembersSection && (
        <MemberSection
          label={t('membersCount', { count: orgRowCount })}
          isEmpty={!isLoadingRoster && filteredOrgMembers.length + filteredOrgPending.length === 0}
          emptyText={isActiveSearch ? t('noMatches', { query }) : t('noMembersYet')}
        >
          {filteredOrgMembers.map(renderOrgMemberRow)}
          {filteredOrgPending.map(renderOrgInviteRow)}
        </MemberSection>
      )}

      {workspaceGroups.map(({ workspace, workspaceMembers, workspaceInvites }) => {
        const visibleMembers = workspaceMembers.filter(({ member }) =>
          matches(member.name, member.email)
        )
        const visibleInvites = workspaceInvites.filter(({ invitation }) =>
          matches(invitation.inviteeName ?? invitation.email, invitation.email)
        )
        const totalCount = workspaceMembers.length + workspaceInvites.length
        const hasMatches = visibleMembers.length + visibleInvites.length > 0

        if (isActiveSearch && !hasMatches) return null

        return (
          <MemberSection
            key={`workspace-${workspace.id}`}
            label={`${workspace.name} (${totalCount})`}
            isEmpty={visibleMembers.length + visibleInvites.length === 0}
            emptyText={isActiveSearch ? t('noMatches', { query }) : t('noWorkspaceMembers')}
          >
            {visibleMembers.map(({ member, access }) =>
              renderWorkspaceMemberRow(member, workspace.id, access)
            )}
            {visibleInvites.map(({ invitation, access }) =>
              renderWorkspaceInviteRow(invitation, workspace.id, access)
            )}
          </MemberSection>
        )
      })}

      {canManage && (
        <ManageCreditsModal
          key={creditsTarget?.userId ?? 'none'}
          open={creditsTarget !== null}
          onOpenChange={(open) => {
            if (!open) setCreditsTarget(null)
          }}
          organizationId={organizationId}
          member={creditsTarget}
        />
      )}
    </>
  )
}
