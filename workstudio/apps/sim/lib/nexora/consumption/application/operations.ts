import { defineOrganizationOperation } from '@/lib/core/application/organization-operation'

const policy = {
  minimumRole: 'admin',
  principalKinds: ['session'],
} as const

/**
 * Nexora edition: the instance's consumption and monthly budgets, read and set by the instance
 * organization's owners and admins from Réglages › Consommation.
 */
export const nexoraConsumptionOperations = Object.freeze({
  // permission-group-exempt: instance administrators oversee the whole instance's consumption.
  read: defineOrganizationOperation({
    id: 'organization.nexora_consumption.read',
    ...policy,
    capability: 'none',
  }),
  // permission-group-exempt: instance administrators own the instance's monthly budgets.
  readBudgets: defineOrganizationOperation({
    id: 'organization.nexora_budgets.read',
    ...policy,
    capability: 'none',
  }),
  // permission-group-exempt: instance administrators own the instance's monthly budgets.
  updateBudgets: defineOrganizationOperation({
    id: 'organization.nexora_budgets.update',
    ...policy,
    capability: 'none',
  }),
})
