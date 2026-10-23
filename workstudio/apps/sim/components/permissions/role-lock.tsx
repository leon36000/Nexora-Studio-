'use client'

import type { ReactNode } from 'react'
import { Tooltip } from '@sim/emcn'
import { useTranslations } from 'next-intl'

export type WorkspaceRoleSource = 'owner' | 'explicit' | 'org-admin'
export type CredentialRoleSource = 'explicit' | 'workspace-admin'

/**
 * Why a member's role or removal is fixed, as a message key of
 * `settings.permissions.roleLock`; {@link RoleLockTooltip} renders the sentence.
 */
export type RoleLockReason =
  | 'orgAdminRole'
  | 'workspaceOwner'
  | 'billingAccount'
  | 'orgAdminRemoval'
  | 'reassignBilling'
  | 'credentialAdmin'
  | 'skillEditor'

/**
 * Explanation shown when a workspace member's role is fixed and cannot be
 * edited. Returns null for editable roles.
 *
 * Mirrors the server guards on `PATCH /api/workspaces/[id]/permissions`, which
 * refuse the same three cases — so every reason here must have a guard there and
 * vice versa, or the UI offers a control that can only fail.
 */
export function workspaceRoleLockReason(
  roleSource: WorkspaceRoleSource | undefined,
  options?: { isBilledAccount?: boolean }
): RoleLockReason | null {
  if (roleSource === 'org-admin') return 'orgAdminRole'
  if (roleSource === 'owner') return 'workspaceOwner'
  if (options?.isBilledAccount) return 'billingAccount'
  return null
}

/**
 * Explanation shown when a workspace member cannot be removed from the
 * workspace. Returns null when removal is allowed.
 *
 * Mirrors the server guards on `DELETE /api/workspaces/members/[id]`, so every
 * reason here must have a guard there and vice versa.
 *
 * Deliberately keyed on facts rather than on `roleSource` like
 * {@link workspaceRoleLockReason}: the two disagree about the workspace owner,
 * whose role is fixed but who can still be removed (ownership transfers to the
 * billing account) — and `roleSource` ranks `owner` above `org-admin`, so it
 * cannot answer for someone who is both.
 */
export function workspaceMemberRemovalLockReason(options?: {
  isOrgAdmin?: boolean
  isBilledAccount?: boolean
}): RoleLockReason | null {
  if (options?.isOrgAdmin) return 'orgAdminRemoval'
  if (options?.isBilledAccount) return 'reassignBilling'
  return null
}

/**
 * Explanation shown when a credential member's role is fixed because they are a
 * workspace admin. Returns null for editable (`explicit`) roles.
 */
export function credentialRoleLockReason(
  roleSource: CredentialRoleSource | undefined
): RoleLockReason | null {
  return roleSource === 'workspace-admin' ? 'credentialAdmin' : null
}

/**
 * Explanation shown when a skill editor's access is inherited from their
 * workspace admin role rather than an explicit grant, and so cannot be removed.
 * Returns null for explicitly added editors.
 */
export function skillEditorLockReason(isWorkspaceAdmin: boolean): RoleLockReason | null {
  return isWorkspaceAdmin ? 'skillEditor' : null
}

interface RoleLockTooltipProps {
  reason: RoleLockReason | null
  children: ReactNode
}

/**
 * Wraps a disabled role control in a tooltip explaining why the role is fixed.
 * Renders children unchanged when there is no lock reason.
 *
 * The trigger is a `grid` so the wrapper stays layout-transparent; a
 * shrink-to-content wrapper would size locked and unlocked rows differently.
 */
export function RoleLockTooltip({ reason, children }: RoleLockTooltipProps) {
  const t = useTranslations('settings.permissions.roleLock')
  if (!reason) return <>{children}</>

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <div className='grid'>{children}</div>
      </Tooltip.Trigger>
      <Tooltip.Content>{t(reason)}</Tooltip.Content>
    </Tooltip.Root>
  )
}
