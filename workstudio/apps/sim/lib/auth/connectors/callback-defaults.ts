import type { GenericOAuthConfig } from 'better-auth/plugins'
import { getBaseUrl } from '@/lib/core/utils/urls'

/**
 * Keeps a generic OAuth provider behaving as it did before Better Auth 1.7 made these
 * providers ordinary social providers.
 *
 * - The redirect URI sent to the provider stays `/api/auth/oauth2/callback/:id`: that is the
 *   URL operators registered at each third-party console. The auth route rewrites it to the
 *   `/callback/:id` endpoint Better Auth now serves.
 * - PKCE stays off unless the provider asks for it (1.7 defaults it on, which strict token
 *   endpoints reject for connectors that never sent a challenge).
 * - A custom `getToken` receives the same redirect URI and a verifier only when PKCE is on.
 */
export function withConnectorCallbackDefaults(config: GenericOAuthConfig): GenericOAuthConfig {
  const redirectURI =
    config.redirectURI ?? `${getBaseUrl()}/api/auth/oauth2/callback/${config.providerId}`
  const pkce = config.pkce ?? false
  const { getToken } = config
  return {
    ...config,
    redirectURI,
    pkce,
    ...(getToken && {
      getToken: (data) =>
        getToken({ ...data, redirectURI, codeVerifier: pkce ? data.codeVerifier : undefined }),
    }),
  }
}
