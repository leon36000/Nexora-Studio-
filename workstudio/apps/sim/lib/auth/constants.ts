import { NEXORA_OIDC_PROVIDER_ID } from '@/lib/nexora/oidc'

/**
 * Provider IDs permitted to authenticate (create or link a session) through the
 * unauthenticated sign-in endpoint `/sign-in/social`.
 *
 * Only first-party login providers that verify email ownership belong here.
 * Integration connectors (Salesforce, Jira, the Microsoft/Google work
 * connectors, etc.) are deliberately excluded: they are connected exclusively
 * through the authenticated `/link-social` flow, which binds the new account to
 * the current session user and never mints a session. Allowing a connector to
 * reach the sign-in endpoints enables nOAuth-style account takeover, where a
 * multi-tenant IdP asserting an attacker-controlled, unverified email mints a
 * session for the matching existing user. SSO uses a separate `/sign-in/sso`
 * endpoint and is unaffected by this list.
 *
 * Nexora edition: the company identity provider (`nexora-oidc`) may also sign in. It is a
 * single, operator-configured OpenID Connect issuer, not a multi-tenant integration.
 */
export const SIGN_IN_PROVIDER_IDS = ['google', 'github', 'microsoft'] as const

const signInProviderIdSet: ReadonlySet<string> = new Set(SIGN_IN_PROVIDER_IDS)

/**
 * Returns true when `providerId` is a first-party login provider allowed to sign
 * in. Used to reject integration connectors at the sign-in endpoints so they can
 * only ever be connected through the authenticated link flow.
 */
export function isSignInProviderAllowed(providerId: unknown): boolean {
  return (
    typeof providerId === 'string' &&
    (signInProviderIdSet.has(providerId) || providerId === NEXORA_OIDC_PROVIDER_ID)
  )
}

/**
 * Resolves the provider identifier the sign-in handler will actually act on for a
 * given auth path. Since Better Auth 1.7 the generic OAuth providers are ordinary
 * social providers, so `/sign-in/social` (field `provider`) is the only
 * unauthenticated endpoint that starts an OAuth login. The allowlist guard must read
 * the field the handler uses: reading another one would let a request pass the guard
 * with an allowed value while the handler starts OAuth for a blocked one, reopening
 * connector sign-in.
 */
export function getRequestedSignInProviderId(
  path: string,
  body: { provider?: unknown } | null | undefined
): unknown {
  if (path === '/sign-in/social') return body?.provider
  return undefined
}

const GENERIC_OAUTH_CALLBACK_PREFIX = '/callback/'

/**
 * Whether a Better Auth endpoint path is the callback of a generic OAuth provider
 * (an integration connector or the company identity provider), as opposed to the
 * callback of a first-party login provider (Google, GitHub, Microsoft). Both kinds
 * are served at `/callback/:id`; only the generic ones carry a credential draft.
 * The public URL registered at the third-party console stays
 * `/api/auth/oauth2/callback/:id`, rewritten in the auth route.
 */
export function isGenericOAuthCallbackPath(path: string | undefined): boolean {
  if (!path?.startsWith(GENERIC_OAUTH_CALLBACK_PREFIX)) return false
  return !signInProviderIdSet.has(path.slice(GENERIC_OAUTH_CALLBACK_PREFIX.length))
}

/**
 * A social provider config, narrowed to the Better Auth options that turn off
 * account creation. The index signature carries the rest of the config
 * (`clientId`, `scope`, …) untyped — only the two gate keys matter here, and
 * typing them catches a rename in a Better Auth upgrade.
 */
interface RegistrationGate {
  disableSignUp?: boolean
  disableIdTokenSignIn?: boolean
  [option: string]: unknown
}

/**
 * Stamps DISABLE_REGISTRATION onto every social provider config.
 *
 * The `/sign-up*` gate cannot see OAuth account creation, which happens on
 * `/sign-in/social` and its callback — without this, a registration-disabled
 * deployment still mints accounts for any unknown Google/GitHub/Microsoft
 * identity. Stamping the whole map rather than each provider literal means a
 * provider added later inherits the gate instead of silently reopening the
 * hole; that is the entire point of doing this here rather than inline.
 *
 * Both keys are required because Better Auth resolves the gate differently per
 * entrance. The redirect callback reads `provider.options.disableSignUp`, but
 * the id-token branch of `/sign-in/social` reads a **top-level**
 * `provider.disableSignUp` that is never hoisted from config, so `disableSignUp`
 * alone leaves that entrance open. `disableIdTokenSignIn` closes it by failing
 * `verifyIdToken` before any user lookup. Sim only ever uses the redirect flow,
 * so disabling the id-token path costs nothing today.
 *
 * Existing users are unaffected on both paths — the gate only rejects when no
 * account matches the verified identity.
 *
 * Returns the map untouched when the flag is off, so a registration-enabled
 * deployment hands Better Auth the exact object it had before. Better Auth also
 * accepts a lazily-evaluated (function) provider config, which this could not
 * stamp — spreading a function drops its credentials — but {@link
 * RegistrationGate}'s index signature makes that a compile error, so it cannot
 * reach here ungated.
 */
export function applyRegistrationGate<T extends Record<string, RegistrationGate>>(
  providers: T,
  registrationDisabled: boolean
): T {
  if (!registrationDisabled) return providers

  const gated: Record<string, RegistrationGate> = {}
  for (const [id, config] of Object.entries(providers)) {
    gated[id] = { ...config, disableSignUp: true, disableIdTokenSignIn: true }
  }
  /** The spread widens past what TypeScript can prove; the keys are unchanged. */
  return gated as T
}

/**
 * How a sign-in refused by an organization's single sign-on requirement identifies itself. Here
 * rather than beside the policy so the sign-in and verification screens can recognize the refusal
 * without pulling the policy module — and its database dependencies — into the browser bundle.
 */
export const SSO_REQUIRED_ERROR_CODE = 'SSO_REQUIRED'

export const SSO_REQUIRED_MESSAGE =
  'Your organization requires single sign-on. Sign in through your identity provider.'
