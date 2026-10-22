import { getEnv } from '@/lib/core/config/env'

/** Nexora's guide, used until a dedicated documentation site is configured. */
export const NEXORA_GUIDE_URL = 'https://github.com/leon36000/Nexora-Studio-/tree/main/docs/guide'

/**
 * Link to a documentation page. Joins `NEXT_PUBLIC_DOCUMENTATION_URL` and `path`
 * when a documentation site is configured; otherwise points to the Nexora guide,
 * since the upstream page paths have no equivalent there.
 */
export function docsUrl(path = ''): string {
  const base = getEnv('NEXT_PUBLIC_DOCUMENTATION_URL')?.trim().replace(/\/+$/, '')
  if (!base) return NEXORA_GUIDE_URL
  if (!path) return base
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`
}
