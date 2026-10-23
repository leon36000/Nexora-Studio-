import { createLogger } from '@sim/logger'
import { safeCompare } from '@sim/security/compare'
import { hmacSha256Hex } from '@sim/security/hmac'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { env } from '@/lib/core/config/env'
import { reconcileWorkspaceConnect } from '@/lib/nexora/connect'
import {
  ConnectRefusedError,
  ConnectUnavailableError,
  listWorkspaceConnections,
  type WorkspaceConnection,
} from '@/lib/nexora/connect-admin'
import { getUserEntityPermissions } from '@/lib/workspaces/permissions/utils'

const logger = createLogger('NexoraConnectors')

/**
 * The signed-in user's access to a workspace's connectors: anyone in the workspace browses the
 * catalog, editors connect and disconnect. A response is returned when the user may not.
 */
export async function connectorAccess(
  workspaceId: string,
  need: 'read' | 'write'
): Promise<{ userId: string; canManage: boolean } | NextResponse> {
  const session = await getSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const permission = await getUserEntityPermissions(session.user.id, 'workspace', workspaceId)
  const canManage = permission === 'write' || permission === 'admin'
  if (!permission || (need === 'write' && !canManage)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return { userId: session.user.id, canManage }
}

/**
 * The workspace's connections, after bringing its Nexora Connect isolation in line: any member's
 * visit gives a workspace still on the shared token (created before connectors, or whose token
 * could not be made or installed) its own token, and aligns the token's grant with the
 * connections (an OAuth finished after the page stopped following it, a connection made in the
 * Connect console). Best-effort: the page still shows when this fails.
 */
export async function reconciledWorkspaceConnections(workspace: {
  workspaceId: string
  userId: string
}): Promise<WorkspaceConnection[]> {
  try {
    const connections = await reconcileWorkspaceConnect(workspace)
    if (connections) return connections
  } catch (error) {
    logger.warn('Nexora Connect isolation not reconciled', {
      workspaceId: workspace.workspaceId,
      error,
    })
  }
  return listWorkspaceConnections(workspace.workspaceId)
}

function oauthHandleSecret(): string {
  const secret = env.NEXORA_CONNECT_ADMIN_TOKEN?.trim()
  if (!secret) throw new ConnectUnavailableError('not configured')
  return secret
}

function oauthSignature(workspaceId: string, requestId: string): string {
  return hmacSha256Hex(`nexora-oauth:${workspaceId}:${requestId}`, oauthHandleSecret())
}

/**
 * The OAuth request id the page follows, bound to the workspace that started it: Nexora Connect's
 * requests are instance-wide, so a bare id would let a member of another workspace follow it.
 */
export function signOAuthRequest(workspaceId: string, requestId: string): string {
  return `${requestId}.${oauthSignature(workspaceId, requestId)}`
}

/** The Connect request id behind a handle from {@link signOAuthRequest}, or `null` when it was not issued to this workspace. */
export function readOAuthRequest(workspaceId: string, handle: string): string | null {
  const separator = handle.lastIndexOf('.')
  if (separator <= 0) return null
  const requestId = handle.slice(0, separator)
  return safeCompare(handle.slice(separator + 1), oauthSignature(workspaceId, requestId))
    ? requestId
    : null
}

/** `{ error: <code> }` the connectors page words in French; Connect's own detail stays in the logs. */
export function connectorErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof ConnectUnavailableError) {
    logger.warn('Nexora Connect is unavailable', { detail: error.message })
    return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  }
  if (error instanceof ConnectRefusedError) {
    logger.warn('Nexora Connect refused a request', { code: error.code })
    if (error.code === 'unknown_service') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    return error.code === 'request_superseded'
      ? NextResponse.json({ error: 'superseded' }, { status: 409 })
      : NextResponse.json({ error: 'refused', code: error.code }, { status: 400 })
  }
  return null
}
