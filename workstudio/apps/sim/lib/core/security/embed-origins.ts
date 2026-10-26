/**
 * Origins allowed to frame the public chat pages (`NEXORA_EMBED_ORIGINS`).
 *
 * Loaded by `csp.ts`, which `next.config.ts` imports before `@/` aliases resolve: no `@/` import here.
 * Pure on purpose: the caller logs what was rejected.
 */

export interface RejectedEmbedOrigin {
  entry: string
  reason: string
}

export interface ParsedEmbedOrigins {
  /** True when the variable holds at least one entry, valid or not. */
  configured: boolean
  origins: string[]
  rejected: RejectedEmbedOrigin[]
}

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]'])

function checkEntry(entry: string): { origin: string } | { reason: string } {
  if (entry.includes('*')) return { reason: 'joker' }
  if (/[\s;]/.test(entry)) return { reason: 'origine illisible' }
  let url: URL
  try {
    url = new URL(entry)
  } catch {
    return { reason: 'origine illisible' }
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { reason: 'schéma' }
  if (url.username || url.password) return { reason: 'identifiants' }
  if (url.protocol === 'http:' && !LOCAL_HOSTNAMES.has(url.hostname)) {
    return { reason: 'http hors localhost' }
  }
  if (url.pathname !== '/' || /[?#]/.test(entry)) return { reason: 'chemin, requête ou fragment' }
  return { origin: url.origin }
}

/**
 * Parses a comma-separated list of origins. Each entry must be `https://host[:port]` or
 * `http://localhost|127.0.0.1|[::1][:port]`; wildcards are never accepted, so a typo cannot open the
 * instance to a whole domain.
 */
export function parseEmbedOrigins(raw: string | undefined): ParsedEmbedOrigins {
  const entries = (raw ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
  const origins = new Set<string>()
  const rejected: RejectedEmbedOrigin[] = []
  for (const entry of entries) {
    const checked = checkEntry(entry)
    if ('origin' in checked) origins.add(checked.origin)
    else rejected.push({ entry, reason: checked.reason })
  }
  return { configured: entries.length > 0, origins: [...origins], rejected }
}
