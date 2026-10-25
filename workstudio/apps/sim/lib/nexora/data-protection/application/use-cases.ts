import { AuditAction, AuditResourceType } from '@sim/audit'
import { defineAuthorizedOrganizationUseCase } from '@/lib/core/application/authorized-organization-use-case'
import { OrchestrationError } from '@/lib/core/orchestration/types'
import { existingWorkspaceIds, listBudgetWorkspaces } from '@/lib/nexora/consumption/workspaces'
import { nexoraDataProtectionOperations } from '@/lib/nexora/data-protection/application/operations'
import {
  type DataProtectionChange,
  readDataProtection,
  updateDataProtection,
} from '@/lib/nexora/data-protection/policy'
import { piiServiceStatus } from '@/lib/nexora/data-protection/service-status'

interface InstanceInput {
  /** The instance organization, whose owners and admins govern the policy. */
  organizationId: string
}

async function overview(organizationId: string) {
  const [stored, workspaces, service] = await Promise.all([
    readDataProtection(),
    listBudgetWorkspaces(),
    piiServiceStatus(),
  ])
  if (!stored || stored.organizationId !== organizationId) {
    throw new OrchestrationError('not_found', 'The instance organization was not found')
  }
  return {
    policy: { defaultMode: stored.defaultMode, workspaceModes: stored.workspaceModes },
    workspaces,
    service,
  }
}

export const readNexoraDataProtection = defineAuthorizedOrganizationUseCase({
  operation: nexoraDataProtectionOperations.read,
  execute: ({ input }: { input: InstanceInput }) => overview(input.organizationId),
})

/**
 * Saves a policy change. A mode can only be set on an existing workspace; removing one does not
 * need it to exist, so the mode of a since-deleted workspace can still be cleared.
 */
export const updateNexoraDataProtection = defineAuthorizedOrganizationUseCase({
  operation: nexoraDataProtectionOperations.update,
  execute: async ({ input }: { input: InstanceInput & { change: DataProtectionChange } }) => {
    const modes = Object.entries(input.change.workspaceModes ?? {})
      .filter(([, mode]) => mode !== null)
      .map(([workspaceId]) => workspaceId)
    const existing = await existingWorkspaceIds(modes)
    const unknown = modes.filter((workspaceId) => !existing.has(workspaceId))
    if (unknown.length > 0) {
      throw new OrchestrationError('validation', `Unknown workspace: ${unknown.join(', ')}`)
    }
    const before = await readDataProtection()
    await updateDataProtection(input.organizationId, input.change)
    return { ...(await overview(input.organizationId)), previous: before }
  },
  projectAudit: ({ input, result }) => ({
    action: AuditAction.NEXORA_DATA_PROTECTION_UPDATED,
    resourceType: AuditResourceType.ORGANIZATION,
    resourceId: input.organizationId,
    description: 'Updated the personal data policy',
    metadata: {
      change: input.change,
      previousDefaultMode: result.previous?.defaultMode ?? null,
      previousWorkspaceModes: result.previous?.workspaceModes ?? {},
    },
  }),
})
