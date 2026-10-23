import { isRecordLike } from '@sim/utils/object'
import { env } from '@/lib/core/config/env'

/**
 * Placeholder token of a workspace's « Nexora Connect » server registered while Connect could not
 * issue the workspace's own token. Connect accepts no such token, so the server reaches nothing
 * until the workspace is repaired; never the shared runtime token, which reaches every connection.
 */
export const CONNECT_TOKEN_PENDING = 'nexora-connect-pending'

const AUTHORIZATION = 'authorization'

/** Whether `url` points at Nexora Connect (any path or query on its origin). */
export function isNexoraConnectUrl(url: string | null | undefined): boolean {
  const connectUrl = env.NEXORA_CONNECT_MCP_URL?.trim()
  if (!url || !connectUrl) return false
  try {
    return new URL(url).origin === new URL(connectUrl).origin
  } catch {
    return false
  }
}

function stringHeaders(headers: unknown): Record<string, string> {
  if (!isRecordLike(headers)) return {}
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string') result[key] = value
  }
  return result
}

function withoutAuthorization(headers: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== AUTHORIZATION) result[key] = value
  }
  return result
}

function authorizationOf(headers: unknown): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(stringHeaders(headers))) {
    if (key.toLowerCase() === AUTHORIZATION) result[key] = value
  }
  return result
}

/** A server's headers with its Authorization replaced by the workspace token. */
export function withConnectToken(headers: unknown, token: string): Record<string, string> {
  return { ...withoutAuthorization(stringHeaders(headers)), Authorization: `Bearer ${token}` }
}

/**
 * The headers an MCP server write may store when Nexora Connect is involved. A workspace's
 * « Nexora Connect » server carries the workspace's own token, which only Nexora sets: an edit
 * (the settings form, which never receives the value, or any other API caller) keeps the stored
 * token and cannot choose another, and pointing the server elsewhere drops the token so it never
 * leaves for another host. `undefined` means: leave the stored headers as they are.
 */
export function guardNexoraConnectHeaders(input: {
  storedUrl: string | null | undefined
  storedHeaders: unknown
  nextUrl: string | null | undefined
  incoming: Record<string, string> | undefined
}): Record<string, string> | undefined {
  const wasConnect = isNexoraConnectUrl(input.storedUrl)
  const isConnect = isNexoraConnectUrl(input.nextUrl)
  if (!wasConnect && !isConnect) return input.incoming
  const base = input.incoming ?? stringHeaders(input.storedHeaders)
  if (!isConnect) return withoutAuthorization(base)
  if (wasConnect && input.incoming === undefined) return undefined
  return {
    ...withoutAuthorization(base),
    ...(wasConnect ? authorizationOf(input.storedHeaders) : {}),
  }
}

/**
 * Whether a « Nexora Connect » server's headers show it is not isolated yet: no token, the
 * deployment's shared runtime token (which reaches every connection), or the pending placeholder.
 */
export function connectTokenNeedsRepair(headers: unknown): boolean {
  const values = Object.values(authorizationOf(headers))
  if (values.length === 0) return true
  const shared = env.NEXORA_CONNECT_TOKEN?.trim()
  return values.some(
    (value) =>
      value === `Bearer ${CONNECT_TOKEN_PENDING}` ||
      (shared !== undefined && value === `Bearer ${shared}`)
  )
}
