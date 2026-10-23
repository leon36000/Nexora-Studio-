/**
 * Codes a request carries when it never reached the server or got no answer from it, as Node
 * (libuv sockets, getaddrinfo and c-ares lookups, undici) and Bun's fetch report them. A stopped
 * container's name stops resolving, so name lookup failures belong here: Bun answers
 * `getaddrinfo ETIMEOUT <host>` for it at once, Node `ENOTFOUND` or `EAI_AGAIN`.
 */
const UNREACHABLE_SERVER_CODES: ReadonlySet<string> = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ECONNABORTED',
  'EHOSTUNREACH',
  'EHOSTDOWN',
  'ENETUNREACH',
  'ENETDOWN',
  'ETIMEDOUT',
  'EPIPE',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ETIMEOUT',
  'ESERVFAIL',
  'EREFUSED',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_SOCKET',
  'ConnectionRefused',
  'ConnectionClosed',
  'FailedToOpenSocket',
])

/** `getaddrinfo ETIMEOUT ollama`, `connect ECONNREFUSED 172.18.0.4:11434`, also inside a wrapper's message. */
const SYSCALL_IN_MESSAGE = /\b(?:getaddrinfo|connect|read|write|query[A-Z]*) ([A-Za-z_]+)\b/
/** What Bun's fetch says for `ConnectionRefused`. */
const BUN_UNABLE_TO_CONNECT = 'Unable to connect. Is the computer able to access the url?'

/**
 * Whether an error message (a stored processing error, a wrapper that kept only the message)
 * says the server could not be reached.
 */
export function isServerUnreachableMessage(message: string): boolean {
  if (message.includes(BUN_UNABLE_TO_CONNECT)) return true
  const code = SYSCALL_IN_MESSAGE.exec(message)?.[1]
  return code !== undefined && UNREACHABLE_SERVER_CODES.has(code)
}

function isUnreachable(error: Error): boolean {
  const code = 'code' in error ? error.code : undefined
  if (typeof code === 'string' && UNREACHABLE_SERVER_CODES.has(code)) return true
  return isServerUnreachableMessage(error.message)
}

/**
 * Whether a request failed because its server could not be reached (refused, reset, unreachable,
 * a name that does not resolve) or did not answer in time, anywhere in the error's `cause` chain
 * or inside an `AggregateError` (undici reports one per address it tried).
 */
export function isServerUnreachableError(error: unknown): boolean {
  const pending = [error]
  const seen = new Set<unknown>()
  while (pending.length > 0 && seen.size < 32) {
    const current = pending.pop()
    if (!(current instanceof Error) || seen.has(current)) continue
    seen.add(current)
    if (isUnreachable(current)) return true
    if (current.cause !== undefined) pending.push(current.cause)
    if (current instanceof AggregateError) pending.push(...current.errors.slice(0, 32))
  }
  return false
}
