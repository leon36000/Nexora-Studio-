import type { GenericOAuthConfig } from 'better-auth/plugins'

/** Better Auth provider id of the company identity provider. Callback: `/api/auth/oauth2/callback/nexora-oidc`. */
export const NEXORA_OIDC_PROVIDER_ID = 'nexora-oidc'

/** Scope of the site's `GET /api/oauth/workstudio-access` (the person's model key). */
const NEXORA_GATEWAY_SCOPE = 'workstudio:model'

interface OidcEnv {
  NEXORA_OIDC_ISSUER?: string
  NEXORA_OIDC_CLIENT_ID?: string
  NEXORA_OIDC_CLIENT_SECRET?: string
}

interface OidcOptions {
  /** `DISABLE_REGISTRATION`: the identity provider signs in existing users only. */
  registrationDisabled?: boolean
  /**
   * `NEXORA_GATEWAY_URL` is set: the site hands each person their model key, and only to a sign-in that
   * asked for this scope (the site answers 403 otherwise).
   */
  gatewayEnabled?: boolean
}

/**
 * Nexora edition: single sign-on with any OpenID Connect provider (Keycloak, Microsoft
 * Entra ID, Google Workspace, Authentik…), configured with three environment variables.
 * Returns `null` until all three are set.
 */
export function buildNexoraOidcProvider(
  vars: OidcEnv,
  { registrationDisabled = false, gatewayEnabled = false }: OidcOptions = {}
): GenericOAuthConfig | null {
  const issuer = vars.NEXORA_OIDC_ISSUER?.trim()
  const clientId = vars.NEXORA_OIDC_CLIENT_ID?.trim()
  const clientSecret = vars.NEXORA_OIDC_CLIENT_SECRET?.trim()
  if (!issuer || !clientId || !clientSecret) return null
  return {
    providerId: NEXORA_OIDC_PROVIDER_ID,
    // No `issuer`: callbacks then check `iss` against the one discovery announces, so a
    // trailing slash typed in the configuration cannot break every sign-in.
    discoveryUrl: `${issuer.replace(/\/+$/, '')}/.well-known/openid-configuration`,
    clientId,
    clientSecret,
    scopes: gatewayEnabled
      ? ['openid', 'profile', 'email', NEXORA_GATEWAY_SCOPE]
      : ['openid', 'profile', 'email'],
    pkce: true,
    disableSignUp: registrationDisabled,
    disableImplicitSignUp: registrationDisabled,
  }
}
