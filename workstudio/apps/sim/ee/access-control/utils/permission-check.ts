// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { type ForbiddenDetailCode, ForbiddenOperationError } from '@/lib/core/application/forbidden'
import { routerResolver } from '@/lib/nexora/developer-api/upstream'
import { isBlockTypeAccessControlExempt } from '@/lib/permission-groups/block-access'
import { CAPABILITY_RULES } from '@/lib/permission-groups/capabilities'
import { refuseCapability } from '@/lib/permission-groups/capability-refusal.server'
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
  constructor(
    name: string,
    message: string,
    code: ForbiddenDetailCode = 'PERMISSION_GROUP_CAPABILITY_BLOCKED'
  ) {
    super(code, message)
    this.name = name
  }
}

/**
 * Messages follow the core contract (`@sim/testing` permission-check mock and core route
 * projections such as `/api/selectors/execute`): "... is not allowed based on your permission
 * group settings", so callers can surface the remedy (an admin changing the group) verbatim.
 */
const GROUP_SETTINGS = 'based on your permission group settings'

export class IntegrationNotAllowedError extends NotAllowedError {
  constructor(
    readonly blockType?: string,
    reason?: string
  ) {
    super(
      'IntegrationNotAllowedError',
      reason
        ? `Integration "${blockType ?? 'unknown'}" is not allowed: ${reason}`
        : `Integration "${blockType ?? 'unknown'}" is not allowed ${GROUP_SETTINGS}`,
      'INTEGRATION_NOT_ALLOWED'
    )
  }
}
export class ToolNotAllowedError extends NotAllowedError {
  constructor(readonly toolId?: string) {
    super('ToolNotAllowedError', `Tool "${toolId ?? 'unknown'}" is not allowed ${GROUP_SETTINGS}`)
  }
}
export class ModelNotAllowedError extends NotAllowedError {
  constructor(readonly model?: string) {
    super('ModelNotAllowedError', `Model "${model ?? 'unknown'}" is not allowed ${GROUP_SETTINGS}`)
  }
}
export class ProviderNotAllowedError extends NotAllowedError {
  constructor(
    readonly provider?: string,
    readonly model?: string
  ) {
    super(
      'ProviderNotAllowedError',
      model
        ? `Provider "${provider ?? 'unknown'}" is not allowed for model "${model}" ${GROUP_SETTINGS}`
        : `Provider "${provider ?? 'unknown'}" is not allowed ${GROUP_SETTINGS}`
    )
  }
}
export class McpToolsNotAllowedError extends NotAllowedError {
  constructor() {
    super('McpToolsNotAllowedError', `MCP tools are not allowed ${GROUP_SETTINGS}`)
  }
}
export class CustomToolsNotAllowedError extends NotAllowedError {
  constructor() {
    super('CustomToolsNotAllowedError', `Custom tools are not allowed ${GROUP_SETTINGS}`)
  }
}
export class SkillsNotAllowedError extends NotAllowedError {
  constructor() {
    super('SkillsNotAllowedError', `Skills are not allowed ${GROUP_SETTINGS}`)
  }
}
export class InvitationsNotAllowedError extends NotAllowedError {
  constructor() {
    super('InvitationsNotAllowedError', `Invitations are not allowed ${GROUP_SETTINGS}`)
  }
}
export class PublicApiNotAllowedError extends NotAllowedError {
  constructor() {
    super('PublicApiNotAllowedError', `Public API access is not allowed ${GROUP_SETTINGS}`)
  }
}

/**
 * Whether the group lets a model through: the gate on the id as given, then — when the group
 * denies models — on the model an alias designates. `nexora-default` is whatever model the
 * administrator made the default (GLM 5.3 on pc6), so denying that model must deny its aliases;
 * an alias list that cannot be read leaves the exact-name check.
 */
async function isModelAllowed(
  config: PermissionGroupConfig | null,
  model: string
): Promise<boolean> {
  const gate = createModelAccessGate(config)
  if (!gate(model)) return false
  if (!config?.deniedModels?.length) return true
  const name = model.replace(/^vllm\//i, '')
  let router: string | null = null
  try {
    router = (await routerResolver())(name)
  } catch {
    return true
  }
  return !router || router.toLowerCase() === name.toLowerCase() || gate(`vllm/${router}`)
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
  if (!(await isModelAllowed(config, model))) throw new ModelNotAllowedError(model)
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
  if (args.toolKind === 'custom' && config.disableCustomTools)
    throw new CustomToolsNotAllowedError()
  if (args.toolKind === 'skill' && config.disableSkills) throw new SkillsNotAllowedError()
  if (args.toolId && config.deniedTools?.length) {
    if (!createToolAccessGate(config.deniedTools)(args.toolId)) {
      throw new ToolNotAllowedError(args.toolId)
    }
  }
  if (args.model && !(await isModelAllowed(config, args.model))) {
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

/**
 * permission-group-enforced: public_api.use — the core execute routes and the deployment-settings
 * use case call this before admitting or enabling unauthenticated API execution.
 */
export async function validatePublicApiAllowed(
  userId: string | null | undefined,
  workspaceId: string | null | undefined
): Promise<void> {
  const config = await loadConfig(userId, workspaceId)
  if (config && CAPABILITY_RULES['public_api.use'].deniedBy(config)) {
    throw new PublicApiNotAllowedError()
  }
}

/**
 * permission-group-enforced: deploy.chat.auth_mode — needs the requested auth mode, which the
 * funnel never sees, so the core chat-deployment use cases assert it here.
 */
export async function validateChatDeployAuth(
  userId: string | null | undefined,
  workspaceId: string | null | undefined,
  authType: string | null | undefined
): Promise<void> {
  if (!authType) return
  const config = await loadConfig(userId, workspaceId)
  if (config && CAPABILITY_RULES['deploy.chat.auth_mode'].deniedBy(config, authType)) {
    refuseCapability('deploy.chat.auth_mode')
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
