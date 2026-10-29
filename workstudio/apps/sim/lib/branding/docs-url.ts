import { getEnv } from '@/lib/core/config/env'
import { getNexoraSiteUrl, nexoraSiteLinks } from '@/lib/nexora/site-links'

/** Whether a documentation site is configured: without one, the help menu offers no « Documentation » entry. */
export function hasDocumentationSite(): boolean {
  return Boolean(getEnv('NEXT_PUBLIC_DOCUMENTATION_URL')?.trim())
}

/**
 * Link to a documentation page. Joins `NEXT_PUBLIC_DOCUMENTATION_URL` and `path` when a
 * documentation site is configured. Until one exists, help goes to the Nexora AI site's contact
 * page (the guide is not published anywhere), and an instance without the site stays on itself:
 * never to a repository or to the upstream project's documentation.
 */
export function docsUrl(path = ''): string {
  const base = getEnv('NEXT_PUBLIC_DOCUMENTATION_URL')?.trim().replace(/\/+$/, '')
  if (!base) return nexoraSiteLinks(getNexoraSiteUrl(), 'fr')?.contact ?? '/'
  if (!path) return base
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`
}
