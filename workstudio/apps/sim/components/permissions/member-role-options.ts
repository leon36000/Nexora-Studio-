import { useMemo } from 'react'
import { useTranslations } from 'next-intl'

/** Role assignable to a member of a shared resource (credential, skill). */
export type MemberRole = 'member' | 'admin'

export interface MemberRoleOption {
  value: MemberRole
  label: string
}

/**
 * Roles assignable to a resource member. Shared by every member-management
 * surface (credential detail, skill members) so role choices never drift.
 */
const MEMBER_ROLES: readonly MemberRole[] = ['member', 'admin'] as const

/** {@link MEMBER_ROLES} as dropdown options labelled in the current locale. */
export function useMemberRoleOptions(): readonly MemberRoleOption[] {
  const t = useTranslations('settings.permissions.roles')
  return useMemo(() => MEMBER_ROLES.map((value) => ({ value, label: t(value) })), [t])
}

export type SkillEditorRole = 'editor'

/**
 * Skill membership is binary — a user either edits the skill or does not, and
 * `skill_member` has no role column. The single option keeps the roster's role
 * control identical in shape to the credential surface's while being honest
 * that there is nothing to switch between; every skill row renders it disabled.
 */
export function useSkillEditorRoleOptions(): readonly { value: SkillEditorRole; label: string }[] {
  const t = useTranslations('settings.permissions.roles')
  return useMemo(() => [{ value: 'editor' as const, label: t('editor') }], [t])
}
