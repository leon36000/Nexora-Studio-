import { type NextRequest, NextResponse } from 'next/server'
import { connectorOAuthStatusContract } from '@/lib/api/contracts/nexora-connectors'
import { parseRequest } from '@/lib/api/server'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { reconcileWorkspaceConnect } from '@/lib/nexora/connect'
import { getOAuthStatus, personalConnectionName } from '@/lib/nexora/connect-admin'
import {
  connectorAccess,
  connectorErrorResponse,
  readOAuthRequest,
} from '@/lib/nexora/connectors-access'
import { forgetPersonalConnectGrants } from '@/lib/nexora/personal-connect'

interface RouteContext {
  params: Promise<{ requestId: string }>
}

const STATUSES = new Set(['initiated', 'connected', 'failed', 'expired'])

/**
 * Where an OAuth consent started by this workspace stands; once connected, the workspace token
 * gains the connection. A request started by another workspace is not found.
 */
export const GET = withRouteHandler(async (request: NextRequest, context: RouteContext) => {
  const parsed = await parseRequest(connectorOAuthStatusContract, request, context)
  if (!parsed.success) return parsed.response
  const { workspaceId, scope } = parsed.data.query
  const personal = scope === 'personal'
  const access = await connectorAccess(workspaceId, personal ? 'read' : 'write')
  if (access instanceof NextResponse) return access
  try {
    const owner = personal ? personalConnectionName(access.userId) : workspaceId
    const requestId = readOAuthRequest(owner, parsed.data.params.requestId)
    if (!requestId) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    const { status, errorMessage, errorCode } = await getOAuthStatus(requestId)
    if (status === 'connected') {
      if (personal) forgetPersonalConnectGrants(access.userId)
      else await reconcileWorkspaceConnect({ workspaceId, userId: access.userId })
    }
    return NextResponse.json({
      status: STATUSES.has(status) ? status : 'failed',
      errorMessage,
      errorCode,
    })
  } catch (error) {
    const response = connectorErrorResponse(error)
    if (response) return response
    throw error
  }
})
