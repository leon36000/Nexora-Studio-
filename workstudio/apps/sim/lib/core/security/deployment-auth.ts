import { createLogger } from '@sim/logger'
import type { NextRequest } from 'next/server'
import {
  type DeploymentAuthKind,
  type DeploymentAuthResource,
  deploymentAuthCookieName,
} from '@/lib/core/security/deployment'
import {
  type DeploymentAuthBody,
  type DeploymentAuthResult,
  validateDeploymentCredentials,
} from '@/lib/core/security/deployment-credentials'
import { getClientIp } from '@/lib/core/utils/request'

const logger = createLogger('DeploymentAuth')

/** Adapts authenticated session identity and HTTP credentials to the common deployment gate. */
export async function validateDeploymentAuth(
  requestId: string,
  resource: DeploymentAuthResource,
  request: NextRequest,
  parsedBody: DeploymentAuthBody | null | undefined,
  cookiePrefix: DeploymentAuthKind
): Promise<DeploymentAuthResult> {
  let sessionEmail: string | null | undefined
  let sessionUserId: string | null | undefined
  let sessionPresent = false
  let workspaceMember = false
  const needsSession = resource.authType === 'sso' || resource.authType === 'workspace'
  if (needsSession && (request.method === 'GET' || parsedBody)) {
    try {
      const { getSession } = await import('@/lib/auth')
      const session = await getSession()
      sessionPresent = Boolean(session?.user)
      sessionEmail = session?.user?.email
      sessionUserId = session?.user?.id
      if (resource.authType === 'workspace' && session?.user?.id && resource.workspaceId) {
        const { getUserEntityPermissions } = await import('@/lib/workspaces/permissions/utils')
        workspaceMember = Boolean(
          await getUserEntityPermissions(session.user.id, 'workspace', resource.workspaceId)
        )
      }
    } catch (error) {
      logger.error(`[${requestId}] Error validating SSO:`, error)
      return { authorized: false, error: 'SSO authentication error' }
    }
  }
  return validateDeploymentCredentials(
    requestId,
    resource,
    {
      method: request.method,
      authToken: request.cookies.get(deploymentAuthCookieName(cookiePrefix, resource.id))?.value,
      clientIp: getClientIp(request),
      sessionPresent,
      sessionEmail,
      sessionUserId,
      workspaceMember,
    },
    parsedBody,
    cookiePrefix
  )
}
