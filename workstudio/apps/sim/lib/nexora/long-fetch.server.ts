import { Agent, fetch as undiciFetch } from 'undici'

/**
 * The runtime's fetch stops waiting for a response after 5 minutes, ignoring the caller's own
 * deadline. Reading a scan, transcribing a recording or structuring a document on a CPU-only
 * server legitimately takes longer, so Nexora API calls that can last minutes go through here.
 */
const NEXORA_LONG_WAIT_MS = 20 * 60 * 1000

/** A fetch whose connection waits up to `waitMs` for the response headers and then the body. */
export function createLongFetch(waitMs: number = NEXORA_LONG_WAIT_MS): typeof fetch {
  const dispatcher = new Agent({ headersTimeout: waitMs, bodyTimeout: waitMs })
  const longFetch = (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) =>
    undiciFetch(input as never, { ...(init as object), dispatcher } as never)
  // double-cast-allowed: undici's fetch and the global one share one runtime contract; only the declared types differ
  return longFetch as unknown as typeof fetch
}

export const nexoraLongFetch = createLongFetch()
