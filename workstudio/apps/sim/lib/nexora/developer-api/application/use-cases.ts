import { AuditAction, AuditResourceType } from '@sim/audit'
import { requirePrincipalSubjectUserId } from '@sim/auth/principal'
import { defineAuthorizedWorkspaceUseCase } from '@/lib/core/application'
import {
  defineAuthorizedOrganizationUseCase,
  type OrganizationUseCaseContext,
} from '@/lib/core/application/authorized-organization-use-case'
import { OrchestrationError } from '@/lib/core/orchestration/types'
import { nexoraApiKeyOperations } from '@/lib/nexora/developer-api/application/operations'
import {
  insertNexoraApiKey,
  type ListedNexoraApiKey,
  listNexoraApiKeys,
  type NexoraApiKeyScope,
  type NexoraApiKeySettings,
  revokeNexoraApiKey,
} from '@/lib/nexora/developer-api/repository'
import { loadActiveWorkspaceApplicationContext } from '@/lib/workspaces/application/context'

async function resolveWorkspace(workspaceId: string) {
  const context = await loadActiveWorkspaceApplicationContext(workspaceId)
  if (!context) throw new OrchestrationError('not_found', 'Workspace not found')
  return context
}

const authorizationOptions = {}

async function findListed(
  scope: NexoraApiKeyScope,
  workspaceId: string | null,
  keyId: string
): Promise<ListedNexoraApiKey> {
  const key = (await listNexoraApiKeys(scope, workspaceId)).find((entry) => entry.id === keyId)
  if (!key) throw new OrchestrationError('not_found', 'API key not found')
  return key
}

/** Audit metadata of a developer API key: never its value. */
function auditMetadata(key: ListedNexoraApiKey) {
  return {
    keyType: 'nexora_api',
    scope: key.scope,
    allowedModels: key.allowedModels,
    allowAgents: key.allowAgents,
    monthlyTokenCap: key.monthlyTokenCap,
    requestsPerMinute: key.requestsPerMinute,
    expiresAt: key.expiresAt?.toISOString() ?? null,
  }
}

async function createKey(
  scope: NexoraApiKeyScope,
  workspaceId: string | null,
  createdBy: string,
  settings: NexoraApiKeySettings
) {
  const { id, value } = await insertNexoraApiKey({ scope, workspaceId, createdBy, settings })
  return { key: await findListed(scope, workspaceId, id), value }
}

async function revokeKey(
  scope: NexoraApiKeyScope,
  workspaceId: string | null,
  keyId: string,
  revokedBy: string
) {
  const revoked = await revokeNexoraApiKey({ keyId, scope, workspaceId, revokedBy })
  if (!revoked) throw new OrchestrationError('not_found', 'API key not found')
  return { key: await findListed(scope, workspaceId, keyId) }
}

interface WorkspaceInput {
  workspaceId: string
}

export const listWorkspaceNexoraApiKeys = defineAuthorizedWorkspaceUseCase({
  operation: nexoraApiKeyOperations.listWorkspace,
  resolveContext: ({ input }: { input: WorkspaceInput }) => resolveWorkspace(input.workspaceId),
  authorizationOptions,
  execute: async ({ context }) => ({
    keys: await listNexoraApiKeys('workspace', context.workspaceId),
  }),
})

export const createWorkspaceNexoraApiKey = defineAuthorizedWorkspaceUseCase({
  operation: nexoraApiKeyOperations.createWorkspace,
  resolveContext: ({ input }: { input: WorkspaceInput & { settings: NexoraApiKeySettings } }) =>
    resolveWorkspace(input.workspaceId),
  authorizationOptions,
  execute: async ({ context, input, principal }) =>
    createKey(
      'workspace',
      context.workspaceId,
      requirePrincipalSubjectUserId(principal),
      input.settings
    ),
  projectAudit: ({ result }) => ({
    action: AuditAction.API_KEY_CREATED,
    resourceType: AuditResourceType.API_KEY,
    resourceId: result.key.id,
    resourceName: result.key.name,
    description: `Created developer API key "${result.key.name}"`,
    metadata: auditMetadata(result.key),
  }),
})

export const revokeWorkspaceNexoraApiKey = defineAuthorizedWorkspaceUseCase({
  operation: nexoraApiKeyOperations.revokeWorkspace,
  resolveContext: ({ input }: { input: WorkspaceInput & { keyId: string } }) =>
    resolveWorkspace(input.workspaceId),
  authorizationOptions,
  execute: ({ context, input, principal }) =>
    revokeKey(
      'workspace',
      context.workspaceId,
      input.keyId,
      requirePrincipalSubjectUserId(principal)
    ),
  projectAudit: ({ result }) => ({
    action: AuditAction.API_KEY_REVOKED,
    resourceType: AuditResourceType.API_KEY,
    resourceId: result.key.id,
    resourceName: result.key.name,
    description: `Revoked developer API key "${result.key.name}"`,
    metadata: auditMetadata(result.key),
  }),
})

interface InstanceInput {
  /** The instance organization, whose owners and admins govern instance-wide keys. */
  organizationId: string
}

export const listInstanceNexoraApiKeys = defineAuthorizedOrganizationUseCase({
  operation: nexoraApiKeyOperations.listInstance,
  execute: async (_args: OrganizationUseCaseContext<InstanceInput>) => ({
    keys: await listNexoraApiKeys('instance', null),
  }),
})

export const createInstanceNexoraApiKey = defineAuthorizedOrganizationUseCase({
  operation: nexoraApiKeyOperations.createInstance,
  execute: ({
    input,
    principal,
  }: OrganizationUseCaseContext<InstanceInput & { settings: NexoraApiKeySettings }>) =>
    createKey('instance', null, requirePrincipalSubjectUserId(principal), input.settings),
  projectAudit: ({ result, input }) => ({
    action: AuditAction.API_KEY_CREATED,
    resourceType: AuditResourceType.API_KEY,
    resourceId: result.key.id,
    resourceName: result.key.name,
    description: `Created instance developer API key "${result.key.name}"`,
    metadata: { ...auditMetadata(result.key), organizationId: input.organizationId },
  }),
})

export const revokeInstanceNexoraApiKey = defineAuthorizedOrganizationUseCase({
  operation: nexoraApiKeyOperations.revokeInstance,
  execute: ({ input, principal }: OrganizationUseCaseContext<InstanceInput & { keyId: string }>) =>
    revokeKey('instance', null, input.keyId, requirePrincipalSubjectUserId(principal)),
  projectAudit: ({ result, input }) => ({
    action: AuditAction.API_KEY_REVOKED,
    resourceType: AuditResourceType.API_KEY,
    resourceId: result.key.id,
    resourceName: result.key.name,
    description: `Revoked instance developer API key "${result.key.name}"`,
    metadata: { ...auditMetadata(result.key), organizationId: input.organizationId },
  }),
})
