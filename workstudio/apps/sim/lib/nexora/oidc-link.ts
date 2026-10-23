import { account, member, user } from '@sim/db/schema'
import { createLogger } from '@sim/logger'
import { isOrgAdminRole } from '@sim/platform-authz/workspace'
import { normalizeEmail } from '@sim/utils/string'
import { APIError } from 'better-auth/api'
import { eq } from 'drizzle-orm'
import { getAccessControlConfig } from '@/lib/auth/access-control'
import { getAuthDatabase } from '@/lib/auth/database-context'
import { env } from '@/lib/core/config/env'
import { NEXORA_SSO_LINK_REFUSED } from '@/lib/nexora/auth-refusals'
import { envOverrides } from '@/lib/nexora/instance-settings-env'
import { NEXORA_OIDC_PROVIDER_ID } from '@/lib/nexora/oidc'

const logger = createLogger('NexoraOidcLink')

interface ImplicitLinkInput {
  /** The account's organization role; owners and admins hold the whole instance. */
  role: string | null
  email: string
  allowedDomains: readonly string[]
  allowedEmails: readonly string[]
  /** The provider comes from deploy/.env (the server's operator), not from Réglages. */
  issuerFromEnv: boolean
}

/**
 * Whether the company identity provider may take over an existing account because it asserts the
 * same verified address. The provider can be set in Réglages, so its word alone is not enough:
 * an owner's or admin's account is never taken over this way (they link from their own session),
 * and another account only when its address belongs to an allowed domain — or, with no domain
 * listed, when the operator configured the provider in deploy/.env.
 */
function isImplicitOidcLinkAllowed({
  role,
  email,
  allowedDomains,
  allowedEmails,
  issuerFromEnv,
}: ImplicitLinkInput): boolean {
  if (role !== null && isOrgAdminRole(role)) return false
  const normalized = normalizeEmail(email)
  if (allowedDomains.length === 0 && allowedEmails.length === 0) return issuerFromEnv
  if (allowedEmails.includes(normalized)) return true
  const domain = normalized.split('@')[1]
  return Boolean(domain && allowedDomains.includes(domain))
}

interface LinkFlow {
  /** Better Auth's parsed OAuth state; `link` is set only for `/oauth2/link`, which needs a session. */
  loadOAuthState: () => Promise<{ link?: { userId: string } } | null | undefined>
}

/**
 * Nexora edition, `account.create.before`: an account row for the company identity provider is
 * either a new person signing up (no other account yet), a person linking it from their own
 * session, or Better Auth linking it implicitly to an existing account on sign-in — the case
 * {@link isImplicitOidcLinkAllowed} decides. Reads run on the adapter's transaction.
 */
export async function assertNexoraOidcLinkAllowed(
  created: { userId: string; providerId: string },
  { loadOAuthState }: LinkFlow
): Promise<void> {
  if (created.providerId !== NEXORA_OIDC_PROVIDER_ID) return
  const state = await loadOAuthState()
  if (state?.link) return

  const executor = getAuthDatabase()
  const [existing] = await executor
    .select({ id: account.id })
    .from(account)
    .where(eq(account.userId, created.userId))
    .limit(1)
  if (!existing) return

  const [person] = await executor
    .select({ email: user.email, role: member.role })
    .from(user)
    .leftJoin(member, eq(member.userId, user.id))
    .where(eq(user.id, created.userId))
    .limit(1)
  const accessControl = await getAccessControlConfig()
  const allowed =
    person !== undefined &&
    isImplicitOidcLinkAllowed({
      role: person.role ?? null,
      email: person.email,
      allowedDomains: accessControl.allowedLoginDomains,
      allowedEmails: accessControl.allowedLoginEmails,
      issuerFromEnv: envOverrides({
        NEXORA_OIDC_ISSUER: env.NEXORA_OIDC_ISSUER,
        NEXORA_SETTINGS_FROM_DB: env.NEXORA_SETTINGS_FROM_DB,
      }).sso,
    })
  if (allowed) return
  logger.warn('Refused to link the company identity provider to an existing account', {
    userId: created.userId,
    role: person?.role ?? null,
  })
  throw new APIError('FORBIDDEN', { message: NEXORA_SSO_LINK_REFUSED })
}
