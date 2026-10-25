import { type NextRequest, NextResponse } from 'next/server'
import { startConnectorOAuthContract } from '@/lib/api/contracts/nexora-connectors'
import { parseRequest } from '@/lib/api/server'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { personalConnectionName, startOAuth, startPersonalOAuth } from '@/lib/nexora/connect-admin'
import {
  connectorAccess,
  connectorErrorResponse,
  signOAuthRequest,
} from '@/lib/nexora/connectors-access'

interface RouteContext {
  params: Promise<{ service: string }>
}

/** Starts the OAuth consent for the workspace's connection; the page opens the returned address. */
export const POST = withRouteHandler(async (request: NextRequest, context: RouteContext) => {
  const parsed = await parseRequest(startConnectorOAuthContract, request, context)
  if (!parsed.success) return parsed.response
  const { workspaceId, scope } = parsed.data.body
  const personal = scope === 'personal'
  const access = await connectorAccess(workspaceId, personal ? 'read' : 'write')
  if (access instanceof NextResponse) return access
  try {
    const { service } = parsed.data.params
    const { requestId, authorizationUrl } = personal
      ? await startPersonalOAuth(access.userId, service)
      : await startOAuth(workspaceId, service)
    // A request is bound to whoever started it: the member for a personal one, else the workspace.
    const owner = personal ? personalConnectionName(access.userId) : workspaceId
    return NextResponse.json({
      requestId: signOAuthRequest(owner, requestId),
      authorizationUrl,
    })
  } catch (error) {
    const response = connectorErrorResponse(error)
    if (response) return response
    throw error
  }
})
