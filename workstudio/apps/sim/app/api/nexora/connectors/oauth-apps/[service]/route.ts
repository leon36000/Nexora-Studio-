import { type NextRequest, NextResponse } from 'next/server'
import { setConnectorOAuthAppContract } from '@/lib/api/contracts/nexora-connectors'
import { parseRequest } from '@/lib/api/server'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { authorizeInstanceAdmin } from '@/lib/nexora/admin-access'
import { setOAuthApp } from '@/lib/nexora/connect-admin'
import { connectorErrorResponse } from '@/lib/nexora/connectors-access'
import { deniedResponse } from '@/lib/nexora/model-responses'
import { isPublicOAuthRedirect } from '@/lib/nexora/oauth-redirect'

interface RouteContext {
  params: Promise<{ service: string }>
}

/**
 * Saves the operator's OAuth application for a service; WorkStudio never stores the secret. The
 * callback address to register is given only when a provider can reach it.
 */
export const PUT = withRouteHandler(async (request: NextRequest, context: RouteContext) => {
  const access = await authorizeInstanceAdmin({ requireInstanceOrganization: true })
  if (!access.ok) return deniedResponse(access.status)
  const parsed = await parseRequest(setConnectorOAuthAppContract, request, context)
  if (!parsed.success) return parsed.response
  try {
    const saved = await setOAuthApp(parsed.data.params.service, parsed.data.body)
    return NextResponse.json({
      configured: saved.configured,
      redirectUri: isPublicOAuthRedirect(saved.redirectUri) ? saved.redirectUri : null,
    })
  } catch (error) {
    const response = connectorErrorResponse(error)
    if (response) return response
    throw error
  }
})
