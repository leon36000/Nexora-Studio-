import { AuditAction, AuditResourceType } from '@sim/audit'
import { defineAuthorizedOrganizationUseCase } from '@/lib/core/application/authorized-organization-use-case'
import { OrchestrationError } from '@/lib/core/orchestration/types'
import { nexoraConsumptionOperations } from '@/lib/nexora/consumption/application/operations'
import { type BudgetChange, readBudgets, updateBudgets } from '@/lib/nexora/consumption/budgets'
import { instanceTimeZone } from '@/lib/nexora/consumption/period'
import { buildConsumptionReport, readMonthToDateUsage } from '@/lib/nexora/consumption/report'
import { existingWorkspaceIds, listBudgetWorkspaces } from '@/lib/nexora/consumption/workspaces'

interface InstanceInput {
  /** The instance organization, whose owners and admins govern consumption. */
  organizationId: string
}

/** The budgets as configured, this month's usage against them, and this month's alerts. */
async function budgetOverview(organizationId: string) {
  const timeZone = instanceTimeZone()
  const [stored, usage, workspaces] = await Promise.all([
    readBudgets(),
    readMonthToDateUsage({ timeZone }),
    listBudgetWorkspaces(),
  ])
  if (!stored || stored.organizationId !== organizationId) {
    throw new OrchestrationError('not_found', 'The instance organization was not found')
  }
  return {
    budgets: {
      instanceMonthlyTokens: stored.instanceMonthlyTokens,
      workspaceMonthlyTokens: stored.workspaceMonthlyTokens,
      alertThreshold: stored.alertThreshold,
    },
    month: usage.month,
    usage: { instance: usage.instance, workspaces: usage.workspaces },
    workspaces,
    alerts: stored.alerts.filter((alert) => alert.month === usage.month),
  }
}

export const readNexoraConsumption = defineAuthorizedOrganizationUseCase({
  operation: nexoraConsumptionOperations.read,
  execute: ({ input }: { input: InstanceInput & { days: number } }) =>
    buildConsumptionReport({ days: input.days, timeZone: instanceTimeZone() }),
})

export const readNexoraBudgets = defineAuthorizedOrganizationUseCase({
  operation: nexoraConsumptionOperations.readBudgets,
  execute: ({ input }: { input: InstanceInput }) => budgetOverview(input.organizationId),
})

/**
 * Saves a budget change. A new cap must name an existing workspace; removing one does not, so
 * the cap of a since-deleted workspace can still be cleared. Lowering a cap applies to the next
 * run, raising one lets refused runs through again at once (see `checkBudget`).
 */
export const updateNexoraBudgets = defineAuthorizedOrganizationUseCase({
  operation: nexoraConsumptionOperations.updateBudgets,
  execute: async ({ input }: { input: InstanceInput & { change: BudgetChange } }) => {
    const capped = Object.entries(input.change.workspaceMonthlyTokens ?? {})
      .filter(([, cap]) => cap !== null)
      .map(([workspaceId]) => workspaceId)
    const existing = await existingWorkspaceIds(capped)
    const unknown = capped.filter((workspaceId) => !existing.has(workspaceId))
    if (unknown.length > 0) {
      throw new OrchestrationError('validation', `Unknown workspace: ${unknown.join(', ')}`)
    }
    await updateBudgets(input.organizationId, input.change)
    return budgetOverview(input.organizationId)
  },
  projectAudit: ({ input }) => ({
    action: AuditAction.NEXORA_BUDGETS_UPDATED,
    resourceType: AuditResourceType.ORGANIZATION,
    resourceId: input.organizationId,
    description: 'Updated monthly token budgets',
    metadata: { change: input.change },
  }),
})
