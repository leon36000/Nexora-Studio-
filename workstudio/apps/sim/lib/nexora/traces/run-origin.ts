import { LRUCache } from 'lru-cache'
import type { RunOriginHint } from '@/lib/nexora/traces/types'

const ORIGIN_TTL_MS = 10 * 60_000

/**
 * What the developer API tells the trace of an agent run it started: the key that called. The
 * execution log does not know it, and the run completes in the same process as the request, so a
 * short-lived note is enough; a run completing elsewhere simply has no key on its trace.
 */
const origins = new LRUCache<string, RunOriginHint>({ max: 5000, ttl: ORIGIN_TTL_MS })

export function noteRunOrigin(executionId: string, hint: RunOriginHint): void {
  origins.set(executionId, hint)
}

/** The note for this execution, removed once read. */
export function takeRunOrigin(executionId: string): RunOriginHint | undefined {
  const hint = origins.get(executionId)
  origins.delete(executionId)
  return hint
}
