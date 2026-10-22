import type { GenericOAuthConfig } from 'better-auth/plugins'

/** Better Auth provider id of the company identity provider. Callback: `/api/auth/oauth2/callback/nexora-oidc`. */
export const NEXORA_OIDC_PROVIDER_ID = 'nexora-oidc'

interface OidcEnv {
  NEXORA_OIDC_ISSUER?: string
  NEXORA_OIDC_CLIENT_ID?: string
  NEXORA_OIDC_CLIENT_SECRET?: string
}

interface OidcOptions {
  /** `DISABLE_REGISTRATION`: the identity provider signs in existing users only. */
  registrationDisabled?: boolean
}

/**
 * Nexora edition: single sign-on with any OpenID Connect provider (Keycloak, Microsoft
 * Entra ID, Google Workspace, Authentik…), configured with three environment variables.
 * Returns `null` until all three are set.
 */
export function buildNexoraOidcProvider(
  vars: OidcEnv,
  { registrationDisabled = false }: OidcOptions = {}
): GenericOAuthConfig | null {
  const issuer = vars.NEXORA_OIDC_ISSUER?.trim()
  const clientId = vars.NEXORA_OIDC_CLIENT_ID?.trim()
  const clientSecret = vars.NEXORA_OIDC_CLIENT_SECRET?.trim()
  if (!issuer || !clientId || !clientSecret) return null
  return {
    providerId: NEXORA_OIDC_PROVIDER_ID,
    discoveryUrl: `${issuer.replace(/\/+$/, '')}/.well-known/openid-configuration`,
    // Callbacks compare `iss` to this verbatim, so it keeps any trailing slash.
    issuer,
    clientId,
    clientSecret,
    scopes: ['openid', 'profile', 'email'],
    pkce: true,
    disableSignUp: registrationDisabled,
    disableImplicitSignUp: registrationDisabled,
  }
}
