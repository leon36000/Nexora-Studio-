import { type NextRequest, NextResponse } from 'next/server'
import { startConnectorOAuthContract } from '@/lib/api/contracts/nexora-connectors'
import { parseRequest } from '@/lib/api/server'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { startOAuth } from '@/lib/nexora/connect-admin'
import { connectorAccess, connectorErrorResponse } from '@/lib/nexora/connectors-access'

interface RouteContext {
  params: Promise<{ service: string }>
}

/** Starts the OAuth consent for the workspace's connection; the page opens the returned address. */
export const POST = withRouteHandler(async (request: NextRequest, context: RouteContext) => {
  const parsed = await parseRequest(startConnectorOAuthContract, request, context)
  if (!parsed.success) return parsed.response
  const { workspaceId } = parsed.data.body
  const access = await connectorAccess(workspaceId, 'write')
  if (access instanceof NextResponse) return access
  try {
    return NextResponse.json(await startOAuth(workspaceId, parsed.data.params.service))
  } catch (error) {
    const response = connectorErrorResponse(error)
    if (response) return response
    throw error
  }
})
