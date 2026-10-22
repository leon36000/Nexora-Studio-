import { isMarketingPath } from '@/lib/landing/routes'

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
  if (pathname === '/terms') return legal.termsUrl?.trim() || '/login'
  if (pathname === '/privacy') return legal.privacyUrl?.trim() || '/login'
  return '/login'
}
