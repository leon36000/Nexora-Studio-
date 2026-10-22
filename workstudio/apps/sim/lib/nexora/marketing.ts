import { isMarketingPath } from '@/lib/landing/routes'

/** Application routes that share a first segment with the marketing site (`app/knowledge`, `app/enterprise`). */
const APPLICATION_PREFIXES = ['/knowledge/github/', '/enterprise/claim/'] as const

export interface LegalDocumentUrls {
  termsUrl?: string
  privacyUrl?: string
}

/**
 * Nexora edition: the upstream marketing site (landing pages, blog, changelog,
 * comparisons, crawler documents) is not served. Returns where to send a request
 * for such a path, or `null` when the path belongs to the application.
 * Legal pages go to the operator's own documents when configured.
 */
export function resolveMarketingRedirect(
  pathname: string,
  legal: LegalDocumentUrls
): string | null {
  if (!isMarketingPath(pathname)) return null
  if (APPLICATION_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null
  if (pathname === '/terms') return legal.termsUrl?.trim() || '/login'
  if (pathname === '/privacy') return legal.privacyUrl?.trim() || '/login'
  return '/login'
}
