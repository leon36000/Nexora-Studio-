import { type NextRequest, NextResponse } from 'next/server'
import { connectorOAuthStatusContract } from '@/lib/api/contracts/nexora-connectors'
import { parseRequest } from '@/lib/api/server'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { getOAuthStatus } from '@/lib/nexora/connect-admin'
import {
  connectorAccess,
  connectorErrorResponse,
  refreshWorkspaceToken,
} from '@/lib/nexora/connectors-access'

interface RouteContext {
  params: Promise<{ requestId: string }>
}

const STATUSES = new Set(['initiated', 'connected', 'failed', 'expired'])

/** Where an OAuth consent stands; once connected, the workspace token gains the connection. */
export const GET = withRouteHandler(async (request: NextRequest, context: RouteContext) => {
  const parsed = await parseRequest(connectorOAuthStatusContract, request, context)
  if (!parsed.success) return parsed.response
  const { workspaceId } = parsed.data.query
  const access = await connectorAccess(workspaceId, 'write')
  if (access instanceof NextResponse) return access
  try {
    const { status, errorMessage } = await getOAuthStatus(parsed.data.params.requestId)
    if (status === 'connected') await refreshWorkspaceToken({ workspaceId, userId: access.userId })
    return NextResponse.json({ status: STATUSES.has(status) ? status : 'failed', errorMessage })
  } catch (error) {
    const response = connectorErrorResponse(error)
    if (response) return response
    throw error
  }
})
