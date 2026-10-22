// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { type ForbiddenDetailCode, ForbiddenOperationError } from '@/lib/core/application/forbidden'
import { isBlockTypeAccessControlExempt } from '@/lib/permission-groups/block-access'
import type { PermissionGroupConfig } from '@/lib/permission-groups/fields'
import {
  resolveAccessControlBlockType,
  toAccessControlAllowlist,
} from '@/lib/permission-groups/integration-allowlist'
import { createModelAccessGate } from '@/lib/permission-groups/model-access'
import { createToolAccessGate } from '@/lib/permission-groups/operation-access'
import {
  getUserPermissionConfig,
  getUserPermissionConfigForOrganization,
  resolveVerifiedUserAccessControlContext,
  resolveWorkspaceGroup,
} from '@/lib/permission-groups/resolve.server'

/**
 * Enforcement glue rebuilt on the core's own policy engine (`@/lib/permission-groups`).
 * With access control disabled the core resolver still returns the env allowlist
 * (ALLOWED_INTEGRATIONS), so self-hosted allowlists keep being enforced server-side.
 */
export {
  getUserPermissionConfig,
  getUserPermissionConfigForOrganization,
  resolveVerifiedUserAccessControlContext,
  resolveWorkspaceGroup,
}

class NotAllowedError extends ForbiddenOperationError {
  constructor(name: string, message: string, code: ForbiddenDetailCode = 'PERMISSION_GROUP_CAPABILITY_BLOCKED') {
    super(code, message)
    this.name = name
  }
}

export class IntegrationNotAllowedError extends NotAllowedError {
  constructor(readonly blockType?: string) {
    super(
      'IntegrationNotAllowedError',
      `Integration "${blockType ?? 'unknown'}" is not allowed`,
      'INTEGRATION_NOT_ALLOWED'
    )
  }
}
export class ToolNotAllowedError extends NotAllowedError {
  constructor(readonly toolId?: string) {
    super('ToolNotAllowedError', `Tool "${toolId ?? 'unknown'}" is not allowed`)
  }
}
export class ModelNotAllowedError extends NotAllowedError {
  constructor(readonly model?: string) {
    super('ModelNotAllowedError', `Model "${model ?? 'unknown'}" is not allowed`)
  }
}
export class ProviderNotAllowedError extends NotAllowedError {
  constructor(readonly provider?: string) {
    super('ProviderNotAllowedError', `Model provider "${provider ?? 'unknown'}" is not allowed`)
  }
}
export class McpToolsNotAllowedError extends NotAllowedError {
  constructor() {
    super('McpToolsNotAllowedError', 'MCP tools are not allowed')
  }
}
export class CustomToolsNotAllowedError extends NotAllowedError {
  constructor() {
    super('CustomToolsNotAllowedError', 'Custom tools are not allowed')
  }
}
export class SkillsNotAllowedError extends NotAllowedError {
  constructor() {
    super('SkillsNotAllowedError', 'Skills are not allowed')
  }
}
export class InvitationsNotAllowedError extends NotAllowedError {
  constructor() {
    super('InvitationsNotAllowedError', 'Sending invitations is not allowed')
  }
}
export class PublicApiNotAllowedError extends NotAllowedError {
  constructor() {
    super('PublicApiNotAllowedError', 'Public API access is not allowed')
  }
}

async function loadConfig(
  userId: string | null | undefined,
  workspaceId: string | null | undefined
): Promise<PermissionGroupConfig | null> {
  if (!userId || !workspaceId) return null
  return getUserPermissionConfig(userId, workspaceId)
}

export async function validateBlockType(
  userId: string | null | undefined,
  workspaceId: string | null | undefined,
  blockType: string,
  _ctx?: unknown
): Promise<void> {
  if (isBlockTypeAccessControlExempt(blockType)) return
  const config = await loadConfig(userId, workspaceId)
  const allowlist = toAccessControlAllowlist(config?.allowedIntegrations ?? null)
  if (allowlist === null) return
  if (!allowlist.has(resolveAccessControlBlockType(blockType.toLowerCase()).toLowerCase())) {
    throw new IntegrationNotAllowedError(blockType)
  }
}

export async function validateModelProvider(
  userId: string | null | undefined,
  workspaceId: string | null | undefined,
  model: string,
  _ctx?: unknown
): Promise<void> {
  const config = await loadConfig(userId, workspaceId)
  if (!createModelAccessGate(config)(model)) throw new ModelNotAllowedError(model)
}

export async function assertPermissionsAllowed(args: {
  userId?: string | null
  workspaceId?: string | null
  toolKind?: 'mcp' | 'custom' | 'skill'
  toolId?: string
  model?: string
  ctx?: unknown
  signal?: AbortSignal
  [key: string]: unknown
}): Promise<void> {
  const config = await loadConfig(args.userId, args.workspaceId)
  if (!config) return
  if (args.toolKind === 'mcp' && config.disableMcpTools) throw new McpToolsNotAllowedError()
  if (args.toolKind === 'custom' && config.disableCustomTools) throw new CustomToolsNotAllowedError()
  if (args.toolKind === 'skill' && config.disableSkills) throw new SkillsNotAllowedError()
  if (args.toolId && config.deniedTools?.length) {
    if (!createToolAccessGate(config.deniedTools)(args.toolId)) {
      throw new ToolNotAllowedError(args.toolId)
    }
  }
  if (args.model && !createModelAccessGate(config)(args.model)) {
    throw new ModelNotAllowedError(args.model)
  }
}

export async function validateInvitationsAllowed(
  userId: string | null | undefined,
  scope: string | { workspaceId?: string; organizationId?: string } | null | undefined,
  _executor?: unknown
): Promise<void> {
  const workspaceId = typeof scope === 'string' ? scope : scope?.workspaceId
  const config = await loadConfig(userId, workspaceId)
  if (config?.disableInvitations) throw new InvitationsNotAllowedError()
}

export async function validatePublicApiAllowed(
  userId: string | null | undefined,
  workspaceId: string | null | undefined
): Promise<void> {
  const config = await loadConfig(userId, workspaceId)
  if (config?.disablePublicApi) throw new PublicApiNotAllowedError()
}

export async function validateChatDeployAuth(
  userId: string | null | undefined,
  workspaceId: string | null | undefined,
  authType: string | null | undefined
): Promise<void> {
  const config = await loadConfig(userId, workspaceId)
  const allowed = config?.allowedChatDeployAuthTypes as readonly string[] | null | undefined
  if (allowed && authType && !allowed.includes(authType)) {
    throw new ForbiddenOperationError(
      'CHAT_AUTH_MODE_NOT_PERMITTED',
      `Chat deployments with "${authType}" access are not allowed`
    )
  }
}

export async function validatePublicFileSharing(
  userId: string | null | undefined,
  workspaceId: string | null | undefined,
  authType: string | null | undefined
): Promise<void> {
  const config = await loadConfig(userId, workspaceId)
  if (!config) return
  const allowed = config.allowedFileShareAuthTypes as readonly string[] | null | undefined
  if (config.disablePublicFileSharing || (allowed && authType && !allowed.includes(authType))) {
    throw new ForbiddenOperationError(
      'PUBLIC_SHARING_NOT_ALLOWED',
      'Public file sharing is not allowed'
    )
  }
}
