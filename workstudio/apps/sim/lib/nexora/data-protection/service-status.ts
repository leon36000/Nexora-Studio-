import { LRUCache } from 'lru-cache'
import { env } from '@/lib/core/config/env'

export interface PiiServiceStatus {
  /** `PII_URL` is set: the profile « pii » is on. */
  configured: boolean
  /** The service answered its health check just now; always `false` when not configured. */
  reachable: boolean
}

const HEALTH_TIMEOUT_MS = 2_000
const STATUS_TTL_MS = 15_000

const statusCache = new LRUCache<'status', PiiServiceStatus>({
  max: 1,
  ttl: STATUS_TTL_MS,
  fetchMethod: async () => {
    const baseUrl = env.PII_URL?.trim().replace(/\/+$/, '')
    if (!baseUrl) return { configured: false, reachable: false }
    try {
      // boundary-raw-fetch: the personal-data service is an internal service fixed by the administrator (PII_URL)
      const response = await fetch(`${baseUrl}/health`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
      })
      return { configured: true, reachable: response.ok }
    } catch {
      return { configured: true, reachable: false }
    }
  },
})

/** Whether the local personal-data service is installed and answering (cached for a few seconds). */
export async function piiServiceStatus(): Promise<PiiServiceStatus> {
  return (await statusCache.fetch('status')) ?? { configured: false, reachable: false }
}

/** Test seam. */
export function resetPiiServiceStatusCache(): void {
  statusCache.clear()
}
