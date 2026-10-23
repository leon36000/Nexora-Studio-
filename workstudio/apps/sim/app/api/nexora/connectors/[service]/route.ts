import { type NextRequest, NextResponse } from 'next/server'
import {
  connectConnectorContract,
  disconnectConnectorContract,
  getConnectorContract,
} from '@/lib/api/contracts/nexora-connectors'
import { parseRequest } from '@/lib/api/server'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { reconcileWorkspaceConnect } from '@/lib/nexora/connect'
import { connectWithCredentials, disconnect, getServiceDetail } from '@/lib/nexora/connect-admin'
import {
  connectorAccess,
  connectorErrorResponse,
  reconciledWorkspaceConnections,
} from '@/lib/nexora/connectors-access'
import { isPublicOAuthRedirect } from '@/lib/nexora/oauth-redirect'

interface RouteContext {
  params: Promise<{ service: string }>
}

/** One service: how to connect it, its actions, and the workspace's connection. */
export const GET = withRouteHandler(async (request: NextRequest, context: RouteContext) => {
  const parsed = await parseRequest(getConnectorContract, request, context)
  if (!parsed.success) return parsed.response
  const { service } = parsed.data.params
  const { workspaceId } = parsed.data.query
  const access = await connectorAccess(workspaceId, 'read')
  if (access instanceof NextResponse) return access
  try {
    const [detail, connections] = await Promise.all([
      getServiceDetail(service),
      reconciledWorkspaceConnections({ workspaceId, userId: access.userId }),
    ])
    const oauthClient = detail.oauthClient
    const redirectUri =
      typeof oauthClient?.expectedRedirectUri === 'string' ? oauthClient.expectedRedirectUri : null
    const oauthAvailable = isPublicOAuthRedirect(redirectUri)
    return NextResponse.json({
      service: detail.service,
      auth: detail.auth.map((entry) => ({
        type: String(entry.type),
        ...(typeof entry.label === 'string' ? { label: entry.label } : {}),
        ...(Array.isArray(entry.fields) ? { fields: entry.fields } : {}),
      })),
      oauth: oauthClient
        ? {
            configured: oauthClient.configured === true,
            available: oauthAvailable,
            redirectUri: oauthAvailable ? redirectUri : null,
          }
        : null,
      actions: detail.actions.slice(0, 200),
      connection: connections.find((c) => c.service === service) ?? null,
      canManage: access.canManage,
    })
  } catch (error) {
    const response = connectorErrorResponse(error)
    if (response) return response
    throw error
  }
})

/** Connects the workspace with an API key or provider credentials (validated by the provider). */
export const POST = withRouteHandler(async (request: NextRequest, context: RouteContext) => {
  const parsed = await parseRequest(connectConnectorContract, request, context)
  if (!parsed.success) return parsed.response
  const { service } = parsed.data.params
  const { workspaceId, authType, values } = parsed.data.body
  const access = await connectorAccess(workspaceId, 'write')
  if (access instanceof NextResponse) return access
  try {
    const connection = await connectWithCredentials(workspaceId, service, authType, values)
    await reconcileWorkspaceConnect({ workspaceId, userId: access.userId })
    return NextResponse.json({ connection })
  } catch (error) {
    const response = connectorErrorResponse(error)
    if (response) return response
    throw error
  }
})

export const DELETE = withRouteHandler(async (request: NextRequest, context: RouteContext) => {
  const parsed = await parseRequest(disconnectConnectorContract, request, context)
  if (!parsed.success) return parsed.response
  const { service } = parsed.data.params
  const { workspaceId } = parsed.data.query
  const access = await connectorAccess(workspaceId, 'write')
  if (access instanceof NextResponse) return access
  try {
    await disconnect(workspaceId, service)
    await reconcileWorkspaceConnect({ workspaceId, userId: access.userId })
    return NextResponse.json({ success: true })
  } catch (error) {
    const response = connectorErrorResponse(error)
    if (response) return response
    throw error
  }
})
