import { Agent, fetch as undiciFetch } from 'undici'

/**
 * The runtime's fetch stops waiting for a response after 5 minutes, ignoring the caller's own
 * deadline. Reading a scan, transcribing a recording or structuring a document on a CPU-only
 * server legitimately takes longer, so Nexora API calls that can last minutes go through here.
 */
const NEXORA_LONG_WAIT_MS = 20 * 60 * 1000

/**
 * undici's fetch does not recognise the runtime's own `FormData`, and would send it as text: the
 * form is encoded here, with the multipart boundary in the content type.
 */
async function encodeFormData(
  init: NonNullable<Parameters<typeof fetch>[1]>
): Promise<NonNullable<Parameters<typeof fetch>[1]>> {
  if (!(init.body instanceof FormData)) return init
  const encoded = new Response(init.body)
  const headers = new Headers(init.headers)
  headers.set('Content-Type', encoded.headers.get('content-type') ?? '')
  return { ...init, headers, body: await encoded.arrayBuffer() }
}

/** A fetch whose connection waits up to `waitMs` for the response headers and then the body. */
export function createLongFetch(waitMs: number = NEXORA_LONG_WAIT_MS): typeof fetch {
  const dispatcher = new Agent({ headersTimeout: waitMs, bodyTimeout: waitMs })
  const longFetch = async (
    input: Parameters<typeof fetch>[0],
    init: Parameters<typeof fetch>[1] = {}
  ) => undiciFetch(input as never, { ...(await encodeFormData(init)), dispatcher } as never)
  // double-cast-allowed: undici's fetch and the global one share one runtime contract; only the declared types differ
  return longFetch as unknown as typeof fetch
}

export const nexoraLongFetch = createLongFetch()
