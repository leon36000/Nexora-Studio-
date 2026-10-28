import { AsyncLocalStorage } from 'node:async_hooks'
import { db } from '@sim/db'
import { oauthResource, organization, workflowMcpServer } from '@sim/db/schema'
import { generateId } from '@sim/utils/id'
import type { BetterAuthPlugin } from 'better-auth'
import { APIError } from 'better-auth/api'
import { and, eq, isNull } from 'drizzle-orm'
import { getSimMcpUrl } from '@/lib/api/mcp/urls'
import {
  narrowResourceOAuthScopes,
  OAUTH_SEARCH_READ_SCOPE,
  type OAuthResourceKind,
} from '@/lib/auth/oauth-provider'
import { getBaseUrl } from '@/lib/core/utils/urls'

interface OAuthResourceIssuance {
  requestedResource: string | null
  verifiedResource?: string | null
}

/**
 * An RFC 8707 audience this deployment issues tokens for. `api` is the Sim MCP
 * server, which serves the Sim API, or a workspace's workflow MCP server;
 * `search` is an organization's Search server.
 */
export interface OAuthResource {
  kind: OAuthResourceKind
  url: string
}

const issuance = new AsyncLocalStorage<OAuthResourceIssuance>()
const SEARCH_RESOURCE_PATH = /^\/api\/mcp\/search\/organizations\/[A-Za-z0-9_-]{1,128}$/
const WORKFLOW_MCP_RESOURCE_PATH = /^\/api\/mcp\/serve\/[A-Za-z0-9_-]{1,128}$/

export class InvalidOAuthResourceError extends Error {
  constructor() {
    super('The resource must be a canonical Nexora MCP server URL.')
    this.name = 'InvalidOAuthResourceError'
  }
}

/**
 * Accepts only this deployment's canonical Sim MCP URL, its organization Search
 * endpoints, and its workflow MCP server endpoints.
 */
export function parseOAuthResource(value: string | null): OAuthResource | null {
  if (value === null) return null
  if (value === getSimMcpUrl()) return { kind: 'api', url: value }
  if (!URL.canParse(value)) throw new InvalidOAuthResourceError()
  const url = new URL(value)
  if (
    value.length > 2048 ||
    url.href !== value ||
    url.origin !== new URL(getBaseUrl()).origin ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new InvalidOAuthResourceError()
  }
  if (SEARCH_RESOURCE_PATH.test(url.pathname)) return { kind: 'search', url: value }
  if (WORKFLOW_MCP_RESOURCE_PATH.test(url.pathname)) return { kind: 'api', url: value }
  throw new InvalidOAuthResourceError()
}

async function oauthResourceTargetExists(resource: OAuthResource): Promise<boolean> {
  if (resource.url === getSimMcpUrl()) return true
  const id = new URL(resource.url).pathname.split('/').pop() ?? ''
  if (resource.kind === 'search') {
    const [row] = await db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.id, id))
      .limit(1)
    return row !== undefined
  }
  const [row] = await db
    .select({ id: workflowMcpServer.id })
    .from(workflowMcpServer)
    .where(and(eq(workflowMcpServer.id, id), isNull(workflowMcpServer.deletedAt)))
    .limit(1)
  return row !== undefined
}

/**
 * Makes a validated MCP server URL a protected resource of the OAuth provider, which since Better
 * Auth 1.7 refuses any `resource` it does not know. Only a URL whose organization or workflow MCP
 * server exists is registered, so unauthenticated authorization requests cannot grow the table.
 * Returns `false` when the server does not exist.
 */
export async function registerOAuthResource(resource: OAuthResource): Promise<boolean> {
  if (!(await oauthResourceTargetExists(resource))) return false
  const now = new Date()
  await db
    .insert(oauthResource)
    .values({
      id: generateId(),
      identifier: resource.url,
      name: resource.url,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: oauthResource.identifier })
  return true
}

/**
 * Whether a grant's scopes belong to its audience: exactly the resource's own
 * family. An unbound token may carry anything but Search, which is never issued
 * without its resource.
 */
function oauthScopesFitResource(
  resource: OAuthResource | null,
  scopes: readonly string[]
): boolean {
  if (!resource) return !scopes.includes(OAUTH_SEARCH_READ_SCOPE)
  return (
    narrowResourceOAuthScopes(scopes.join(' '), resource.kind)?.split(' ').length === scopes.length
  )
}

/** Keeps the token request audience isolated while Better Auth validates the authorization code. */
export function withOAuthResourceIssuance<T>(
  requestedResource: string | null,
  work: () => Promise<T>
): Promise<T> {
  return issuance.run({ requestedResource }, work)
}

/**
 * Runs after Better Auth verifies the code and PKCE, before it writes either token.
 * Its opaque-token path does not persist audiences, so only this verified context
 * may supply the resource stored by the guarded adapter.
 */
export function bindOAuthIssuedResource({
  verificationValue,
  scopes,
}: {
  verificationValue?: { query?: unknown }
  scopes: readonly string[]
}): Record<string, never> {
  const context = issuance.getStore()
  const query = verificationValue?.query
  const resourceValue =
    query && typeof query === 'object' && 'resource' in query ? query.resource : undefined
  let resource: OAuthResource | null
  try {
    if (resourceValue !== undefined && typeof resourceValue !== 'string') {
      throw new InvalidOAuthResourceError()
    }
    resource = parseOAuthResource(resourceValue ?? null)
  } catch {
    throw new APIError('BAD_REQUEST', {
      error: 'invalid_target',
      error_description: 'The authorization resource is invalid.',
    })
  }

  if ((resource?.url ?? null) !== (context?.requestedResource ?? null)) {
    throw new APIError('BAD_REQUEST', {
      error: 'invalid_target',
      error_description: 'The token resource must match the authorization request.',
    })
  }
  if (!oauthScopesFitResource(resource, scopes)) {
    throw new APIError('BAD_REQUEST', {
      error: 'invalid_scope',
      error_description: 'The granted scopes do not match the token resource.',
    })
  }
  if (resource && !context) {
    throw new APIError('BAD_REQUEST', {
      error: 'invalid_target',
      error_description: 'Resource-bound issuance requires a token request.',
    })
  }
  if (context) context.verifiedResource = resource?.url ?? null
  return {}
}

/** Refuses resource-bearing writes unless the validated authorization-code hook ran. */
export function getOAuthIssuedResource(scopes: readonly string[]): string | null {
  const context = issuance.getStore()
  if (
    (context?.requestedResource || scopes.includes(OAUTH_SEARCH_READ_SCOPE)) &&
    !context?.verifiedResource
  ) {
    throw new APIError('BAD_REQUEST', {
      error: 'invalid_target',
      error_description: 'The token resource has not been authorized.',
    })
  }
  return context?.verifiedResource ?? null
}

/** Registers server-owned audience fields with Better Auth's adapter schema. */
export function oauthResourcePlugin() {
  return {
    id: 'sim-oauth-resources',
    schema: {
      oauthAccessToken: {
        fields: { resource: { type: 'string', required: false, input: false, returned: false } },
      },
      oauthRefreshToken: {
        fields: { resource: { type: 'string', required: false, input: false, returned: false } },
      },
    },
  } satisfies BetterAuthPlugin
}
