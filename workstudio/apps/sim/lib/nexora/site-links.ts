import { getEnv } from '@/lib/core/config/env'

/** The path the site serves its sign-in provider under; the issuer ends with it. */
const ISSUER_SUFFIX = '/api/auth'

/** Public variable carrying the site's address to the browser (published at start, see {@link publishNexoraSiteUrl}). */
const SITE_URL_VAR = 'NEXT_PUBLIC_NEXORA_SITE_URL'

export interface NexoraSiteLinks {
  signup: string
  account: string
  billing: string
  activity: string
  contact: string
}

/**
 * Nexora edition: the address of the Nexora AI site, derived from the sign-in issuer
 * (`NEXORA_OIDC_ISSUER`, `https://<site>/api/auth`) by dropping that path. `null` for any other
 * identity provider: its address says nothing about where an account is created or paid.
 */
export function deriveNexoraSiteUrl(issuer: string | null | undefined): string | null {
  const raw = issuer?.trim()
  if (!raw) return null
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  const path = url.pathname.replace(/\/+$/, '')
  if (!path.endsWith(ISSUER_SUFFIX)) return null
  return `${url.origin}${path.slice(0, -ISSUER_SUFFIX.length)}`
}

/**
 * The site's address for this process: the one published at start, else (server only, before it was
 * published, in development for instance) the one derived from the issuer.
 */
export function getNexoraSiteUrl(): string | null {
  const published = getEnv(SITE_URL_VAR)?.trim().replace(/\/+$/, '')
  if (published) return published
  if (typeof window !== 'undefined') return null
  return deriveNexoraSiteUrl(process.env.NEXORA_OIDC_ISSUER)
}

/**
 * Container start: makes the site's address readable in the browser (every `NEXT_PUBLIC_*` value
 * is sent to it) without a second setting. A value the operator set wins.
 */
export function publishNexoraSiteUrl(env: Record<string, string | undefined> = process.env): void {
  if (env[SITE_URL_VAR]?.trim()) return
  const derived = deriveNexoraSiteUrl(env.NEXORA_OIDC_ISSUER)
  if (derived) env[SITE_URL_VAR] = derived
}

/** The site's account pages in the person's language (the site serves French bare, English under `/en`). */
export function nexoraSiteLinks(siteUrl: string | null, locale: string): NexoraSiteLinks | null {
  if (!siteUrl) return null
  const base = `${siteUrl.replace(/\/+$/, '')}${/^en(-|$)/i.test(locale) ? '/en' : ''}`
  return {
    signup: `${base}/compte/inscription`,
    account: `${base}/compte`,
    billing: `${base}/compte/facturation`,
    activity: `${base}/compte/activite`,
    contact: `${base}/contact`,
  }
}
