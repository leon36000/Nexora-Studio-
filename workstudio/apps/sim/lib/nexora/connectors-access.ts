import { createLogger } from '@sim/logger'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { applyWorkspaceConnectToken } from '@/lib/nexora/connect'
import {
  ConnectRefusedError,
  ConnectUnavailableError,
  hasWorkspaceToken,
  syncWorkspaceToken,
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

/** Keeps the workspace's token on exactly its connections; a new token goes on its MCP server. */
export async function refreshWorkspaceToken(workspace: {
  workspaceId: string
  userId: string
}): Promise<void> {
  const { token } = await syncWorkspaceToken(workspace.workspaceId)
  if (token) await applyWorkspaceConnectToken(workspace, token)
}

/**
 * A workspace created before connectors still uses the shared token: give it its own, so its
 * agents see only its connections. Best-effort: the catalog still shows when this fails.
 */
export async function ensureWorkspaceIsolation(workspace: {
  workspaceId: string
  userId: string
}): Promise<void> {
  try {
    if (await hasWorkspaceToken(workspace.workspaceId)) return
    const { token } = await syncWorkspaceToken(workspace.workspaceId, { recreate: true })
    if (token) await applyWorkspaceConnectToken(workspace, token)
  } catch (error) {
    logger.warn('Workspace token for Nexora Connect not set up', {
      workspaceId: workspace.workspaceId,
      error,
    })
  }
}

/** `{ error: <code> }` the connectors page words in French; Connect's own detail stays in the logs. */
export function connectorErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof ConnectUnavailableError) {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  }
  if (error instanceof ConnectRefusedError) {
    logger.warn('Nexora Connect refused a request', { code: error.code })
    return error.code === 'request_superseded'
      ? NextResponse.json({ error: 'superseded' }, { status: 409 })
      : NextResponse.json({ error: 'refused', code: error.code }, { status: 400 })
  }
  return null
}
