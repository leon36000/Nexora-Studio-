import { db } from '@sim/db'
import { invitation, member, user } from '@sim/db/schema'
import { isOrgAdminRole } from '@sim/platform-authz/workspace'
import { normalizeEmail } from '@sim/utils/string'
import { and, eq, gt, sql } from 'drizzle-orm'
import type { AccessControlConfig } from '@/lib/auth/access-control'
import { env } from '@/lib/core/config/env'
import { getInstanceOrganizationId } from '@/lib/organizations/instance-org'

/**
 * Nexora edition: who may create an account and who may sign in with a password.
 *
 * The allowed domains (Réglages › Sécurité, or `ALLOWED_LOGIN_DOMAINS`) say which addresses may
 * sign up on their own; any other address needs a pending invitation. They govern account
 * creation only: an invited consultant, or an owner outside the company domain, keeps signing in.
 */
interface SignUpPolicyInput {
  email: string
  allowedDomains: readonly string[]
  allowedEmails: readonly string[]
  /** `INSTANCE_ORG_OWNER_EMAIL`: the account that must always be creatable. */
  ownerEmail: string | null
  invited: boolean
}

export function isSignUpAllowed({
  email,
  allowedDomains,
  allowedEmails,
  ownerEmail,
  invited,
}: SignUpPolicyInput): boolean {
  if (allowedDomains.length === 0 && allowedEmails.length === 0) return true
  const normalized = normalizeEmail(email)
  if (ownerEmail && normalizeEmail(ownerEmail) === normalized) return true
  if (allowedEmails.includes(normalized)) return true
  const domain = normalized.split('@')[1]
  if (domain && allowedDomains.includes(domain)) return true
  return invited
}

/** {@link isSignUpAllowed} for a sign-up request, reading the invitation only when it decides. */
export async function isNexoraSignUpAllowed(
  email: string,
  accessControl: Pick<AccessControlConfig, 'allowedLoginDomains' | 'allowedLoginEmails'>
): Promise<boolean> {
  const policy = {
    email,
    allowedDomains: accessControl.allowedLoginDomains,
    allowedEmails: accessControl.allowedLoginEmails,
    ownerEmail: env.INSTANCE_ORG_OWNER_EMAIL?.trim() || null,
  }
  if (isSignUpAllowed({ ...policy, invited: false })) return true
  return hasPendingInvitation(email)
}

/**
 * With single sign-on required, members sign in through the identity provider; owners and admins
 * keep their password so a misconfigured provider never locks the instance.
 */
export function isPasswordSignInAllowed({
  ssoRequired,
  role,
}: {
  ssoRequired: boolean
  role: string | null
}): boolean {
  return !ssoRequired || (role !== null && isOrgAdminRole(role))
}

/** Whether `email` holds an unexpired pending invitation (organization or workspace). */
async function hasPendingInvitation(email: string): Promise<boolean> {
  const [row] = await db
    .select({ id: invitation.id })
    .from(invitation)
    .where(
      and(
        sql`lower(${invitation.email}) = ${normalizeEmail(email)}`,
        eq(invitation.status, 'pending'),
        gt(invitation.expiresAt, new Date())
      )
    )
    .limit(1)
  return Boolean(row)
}

/**
 * The organization role of the account behind `email`: in the instance organization when the
 * instance has one, else its highest role anywhere. `null` without an account or a membership.
 */
export async function organizationRoleOfEmail(email: string): Promise<string | null> {
  const instanceOrganizationId = await getInstanceOrganizationId()
  const rows = await db
    .select({ role: member.role })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(
      and(
        sql`lower(${user.email}) = ${normalizeEmail(email)}`,
        instanceOrganizationId ? eq(member.organizationId, instanceOrganizationId) : undefined
      )
    )
  return rows.find((row) => isOrgAdminRole(row.role))?.role ?? rows[0]?.role ?? null
}
