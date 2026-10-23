import { db } from '@sim/db'
import { chat, workflow } from '@sim/db/schema'
import { authorizeWorkflowByWorkspacePermission } from '@sim/platform-authz/workflow'
import { and, eq, isNull } from 'drizzle-orm'
import type { NextRequest, NextResponse } from 'next/server'
import {
  type DeploymentAuthResource,
  setDeploymentAuthCookie,
} from '@/lib/core/security/deployment'
import { validateDeploymentAuth } from '@/lib/core/security/deployment-auth'
import type {
  DeploymentAuthBody,
  DeploymentAuthResult,
} from '@/lib/core/security/deployment-credentials'

export async function setChatAuthCookie(
  response: NextResponse,
  deployment: DeploymentAuthResource,
  verifiedEmail?: string
): Promise<void> {
  await setDeploymentAuthCookie({
    response,
    cookiePrefix: 'chat',
    resource: deployment,
    verifiedEmail,
  })
}

/**
 * Check if user has access to view/edit/delete a specific chat
 */
export async function checkChatAccess(
  chatId: string,
  userId: string
): Promise<{ hasAccess: boolean; chat?: any; workspaceId?: string }> {
  const chatData = await db
    .select({
      chat: chat,
      workflowWorkspaceId: workflow.workspaceId,
    })
    .from(chat)
    .innerJoin(workflow, eq(chat.workflowId, workflow.id))
    .where(and(eq(chat.id, chatId), isNull(chat.archivedAt)))
    .limit(1)

  if (chatData.length === 0) {
    return { hasAccess: false }
  }

  const { chat: chatRecord, workflowWorkspaceId } = chatData[0]
  if (!workflowWorkspaceId) {
    return { hasAccess: false }
  }

  const authorization = await authorizeWorkflowByWorkspacePermission({
    workflowId: chatRecord.workflowId,
    userId,
    action: 'admin',
  })

  return authorization.allowed
    ? { hasAccess: true, chat: chatRecord, workspaceId: workflowWorkspaceId }
    : { hasAccess: false }
}

/**
 * Validates auth for a deployed chat. Thin wrapper over the shared
 * {@link validateDeploymentAuth} with the `'chat'` cookie/rate-limit namespace.
 */
export async function validateChatAuth(
  requestId: string,
  deployment: DeploymentAuthResource & { workflowId?: string },
  request: NextRequest,
  parsedBody?: DeploymentAuthBody
): Promise<DeploymentAuthResult> {
  let resource = deployment
  // Nexora edition: a members-only chat needs the workspace that owns its workflow.
  if (deployment.authType === 'workspace' && !deployment.workspaceId && deployment.workflowId) {
    const [owner] = await db
      .select({ workspaceId: workflow.workspaceId })
      .from(workflow)
      .where(eq(workflow.id, deployment.workflowId))
      .limit(1)
    resource = { ...deployment, workspaceId: owner?.workspaceId ?? null }
  }
  return validateDeploymentAuth(requestId, resource, request, parsedBody, 'chat')
}
