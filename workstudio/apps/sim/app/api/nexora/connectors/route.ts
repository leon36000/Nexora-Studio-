import { type NextRequest, NextResponse } from 'next/server'
import { listConnectorsContract } from '@/lib/api/contracts/nexora-connectors'
import { parseRequest } from '@/lib/api/server'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { listCatalog, listWorkspaceConnections } from '@/lib/nexora/connect-admin'
import {
  connectorAccess,
  connectorErrorResponse,
  ensureWorkspaceIsolation,
} from '@/lib/nexora/connectors-access'

export const dynamic = 'force-dynamic'

/**
 * Raw routes: they administer an external service (Nexora Connect), which holds the credentials,
 * so there is no application operation here. Members browse; editors connect.
 */
export const GET = withRouteHandler(async (request: NextRequest) => {
  const parsed = await parseRequest(listConnectorsContract, request, {})
  if (!parsed.success) return parsed.response
  const { workspaceId, q, category, offset = 0, limit = 60 } = parsed.data.query
  const access = await connectorAccess(workspaceId, 'read')
  if (access instanceof NextResponse) return access
  try {
    if (access.canManage) await ensureWorkspaceIsolation({ workspaceId, userId: access.userId })
    const [catalog, connections] = await Promise.all([
      listCatalog({ query: q, category }),
      listWorkspaceConnections(workspaceId),
    ])
    const connected = new Set(connections.map((c) => c.service))
    const ordered = [
      ...catalog.filter((s) => connected.has(s.service)),
      ...catalog.filter((s) => !connected.has(s.service)),
    ]
    return NextResponse.json({
      services: ordered
        .slice(offset, offset + limit)
        .map((s) => ({ ...s, connected: connected.has(s.service) })),
      total: ordered.length,
      categories: [...new Set(catalog.flatMap((s) => s.categories))].sort(),
      connections,
    })
  } catch (error) {
    const response = connectorErrorResponse(error)
    if (response) return response
    throw error
  }
})
