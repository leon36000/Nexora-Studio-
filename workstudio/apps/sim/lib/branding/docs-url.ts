import { getEnv } from '@/lib/core/config/env'

/** Nexora's guide, used until a dedicated documentation site is configured. */
export const NEXORA_GUIDE_URL = 'https://github.com/leon36000/Nexora-Studio-/tree/main/docs/guide'

/** Base of the guide's individual pages (GitHub renders a file under `blob/`). */
export const NEXORA_GUIDE_PAGE_BASE =
  'https://github.com/leon36000/Nexora-Studio-/blob/main/docs/guide'

/**
 * Upstream help paths, by prefix, and the guide page that covers the same screen. The first
 * matching prefix wins; `{last}` is replaced by the path's last segment (a block anchor).
 */
const GUIDE_PAGES: ReadonlyArray<readonly [prefix: string, page: string]> = [
  ['/getting-started', 'prise-en-main.md'],
  ['/workflows/blocks/', 'blocs.md#{last}'],
  ['/workflows/triggers', 'blocs.md#declencheurs'],
  ['/workflows/deployment', 'workflows.md#deployer'],
  ['/workflows', 'workflows.md'],
  ['/tools/', 'integrations.md'],
  ['/integrations/', 'integrations.md'],
  ['/knowledgebase', 'connaissances.md'],
  ['/tables', 'tables.md'],
  ['/mcp', 'outils-mcp.md'],
  ['/search/mcp', 'outils-mcp.md'],
  ['/models', 'modeles.md'],
  ['/logs-debugging', 'journaux.md'],
  ['/execution', 'journaux.md'],
  ['/platform/', 'reglages.md'],
  ['/permissions', 'reglages.md'],
  ['/agents', 'agents.md'],
  ['/playground', 'playground.md'],
]

function guidePage(path: string): string | null {
  const normalized = `/${path.replace(/^\/+/, '').split('#')[0]}`
  const match = GUIDE_PAGES.find(([prefix]) => normalized.startsWith(prefix))
  if (!match) return null
  const last = normalized.split('/').filter(Boolean).pop() ?? ''
  return `${NEXORA_GUIDE_PAGE_BASE}/${match[1].replace('{last}', last)}`
}

/**
 * Link to a documentation page. Joins `NEXT_PUBLIC_DOCUMENTATION_URL` and `path` when a
 * documentation site is configured; otherwise points to the page of the Nexora guide that
 * covers the same screen, or to the guide's index for anything else.
 */
export function docsUrl(path = ''): string {
  const base = getEnv('NEXT_PUBLIC_DOCUMENTATION_URL')?.trim().replace(/\/+$/, '')
  if (!base) return (path && guidePage(path)) || NEXORA_GUIDE_URL
  if (!path) return base
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`
}
