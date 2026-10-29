import { getEnv } from '@/lib/core/config/env'

/**
 * Name of the company identity provider (`NEXT_PUBLIC_NEXORA_OIDC_NAME`); the sign-in button is hidden
 * while it is unset. Kept outside the `'use client'` button so server pages can call it too.
 */
export function getNexoraOidcName(): string | null {
  return getEnv('NEXT_PUBLIC_NEXORA_OIDC_NAME')?.trim() || null
}
