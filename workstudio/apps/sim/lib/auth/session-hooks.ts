import { member, user } from '@sim/db/schema'
import { createLogger } from '@sim/logger'
import type { Session } from 'better-auth'
import { APIError } from 'better-auth/api'
import { eq } from 'drizzle-orm'
import { getAccessControlConfig, isEmailBlockedByAccessControl } from '@/lib/auth/access-control'
import { getAuthDatabase } from '@/lib/auth/database-context'
import { clampExpiryForSession } from '@/lib/auth/session-policy'
import { assertSsoRequirementSatisfied, satisfiesSsoRequirement } from '@/lib/auth/sso-policy'
import { isNexoraOidcRequired } from '@/lib/core/config/env-flags'
import { isPasswordSignInAllowed } from '@/lib/nexora/auth-policy'
import { NEXORA_SSO_REQUIRED } from '@/lib/nexora/auth-refusals'
import { NEXORA_OIDC_PROVIDER_ID } from '@/lib/nexora/oidc'

const logger = createLogger('SessionHooks')

const NEXORA_OIDC_CALLBACK_PATH = `/oauth2/callback/${NEXORA_OIDC_PROVIDER_ID}`

/**
 * Nexora edition, « connexion obligatoire »: a member's session comes from the company identity
 * provider (or derives from one already open); owners and admins keep their password as a
 * fallback. Checked here, once the credentials are verified, so every password path is covered
 * (sign-in, sign-up's automatic sign-in, e-mail verification) and a wrong password gets the same
 * answer whatever the account's role.
 */
function assertNexoraSsoRequirementSatisfied(role: string | null, path: string | undefined) {
  if (!isNexoraOidcRequired) return
  if (path === NEXORA_OIDC_CALLBACK_PATH || satisfiesSsoRequirement(path)) return
  if (isPasswordSignInAllowed({ ssoRequired: true, role })) return
  logger.warn('Blocking a password session while single sign-on is required', { path })
  throw new APIError('FORBIDDEN', { message: NEXORA_SSO_REQUIRED })
}

/**
 * Rejects blocked accounts and applies membership policy using the adapter's current transaction.
 * `context` is the endpoint creating the session; its path is what tells an organization's sign-in
 * requirement whether this session came from the identity provider.
 */
export async function prepareSessionForCreation<T extends Session>(
  session: T,
  context?: { path?: string } | null
) {
  const executor = getAuthDatabase()
  const accessControl = await getAccessControlConfig()
  const [sessionUser] = await executor
    .select({ email: user.email, suspendedAt: user.suspendedAt })
    .from(user)
    .where(eq(user.id, session.userId))
    .limit(1)

  if (sessionUser?.suspendedAt) {
    logger.warn('Blocking session creation for suspended account', { userId: session.userId })
    throw new APIError('FORBIDDEN', {
      message: 'This account is suspended. Please contact your administrator.',
    })
  }

  if (isEmailBlockedByAccessControl(sessionUser?.email, accessControl)) {
    logger.warn('Blocking session creation for blocked account', { userId: session.userId })
    throw new APIError('FORBIDDEN', {
      message: 'Access restricted. Please contact your administrator.',
    })
  }

  /**
   * A membership that cannot be read is not a membership that does not exist, so a failed lookup
   * refuses the sign-in methods an organization could be requiring against — and only those. Every
   * other path keeps the old behavior of continuing without an organization, so a database blip
   * does not cost a sign-in to people this setting has nothing to say about.
   */
  let membership: { organizationId: string; role: string } | undefined
  try {
    /** Users belong to at most one organization, the same assumption the expiry clamp makes. */
    ;[membership] = await executor
      .select({ organizationId: member.organizationId, role: member.role })
      .from(member)
      .where(eq(member.userId, session.userId))
      .limit(1)
  } catch (error) {
    if (!satisfiesSsoRequirement(context?.path)) throw error
    logger.error('Error reading organization membership', { error, userId: session.userId })
    return { data: session }
  }

  assertNexoraSsoRequirementSatisfied(membership?.role ?? null, context?.path)

  if (!membership) return { data: session }

  /**
   * Outside the fallback below on purpose: a requirement that cannot be read is not a requirement
   * that does not apply, and admitting a password sign-in because a lookup failed is exactly the
   * bypass the setting exists to prevent.
   */
  await assertSsoRequirementSatisfied(
    { userId: session.userId, ...membership },
    context?.path,
    executor
  )

  try {
    const expiresAt = await clampExpiryForSession(session, membership.organizationId, executor)
    return {
      data: { ...session, expiresAt, activeOrganizationId: membership.organizationId },
    }
  } catch (error) {
    /** Session policy is an expiry clamp; failing to read it must not cost a valid sign-in. */
    logger.error('Error clamping session expiry', { error, userId: session.userId })
    return { data: { ...session, activeOrganizationId: membership.organizationId } }
  }
}
