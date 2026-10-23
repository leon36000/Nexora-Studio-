import { type NextRequest, NextResponse } from 'next/server'
import {
  connectConnectorContract,
  disconnectConnectorContract,
  getConnectorContract,
} from '@/lib/api/contracts/nexora-connectors'
import { parseRequest } from '@/lib/api/server'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import {
  connectWithCredentials,
  disconnect,
  getServiceDetail,
  listWorkspaceConnections,
} from '@/lib/nexora/connect-admin'
import {
  connectorAccess,
  connectorErrorResponse,
  refreshWorkspaceToken,
} from '@/lib/nexora/connectors-access'

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
      listWorkspaceConnections(workspaceId),
    ])
    const oauthClient = detail.oauthClient
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
            redirectUri:
              typeof oauthClient.expectedRedirectUri === 'string'
                ? oauthClient.expectedRedirectUri
                : null,
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
    await refreshWorkspaceToken({ workspaceId, userId: access.userId })
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
    await refreshWorkspaceToken({ workspaceId, userId: access.userId })
    return NextResponse.json({ success: true })
  } catch (error) {
    const response = connectorErrorResponse(error)
    if (response) return response
    throw error
  }
})
