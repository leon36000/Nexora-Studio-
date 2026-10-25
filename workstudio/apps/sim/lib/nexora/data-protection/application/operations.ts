import { defineOrganizationOperation } from '@/lib/core/application/organization-operation'

const policy = {
  minimumRole: 'admin',
  principalKinds: ['session'],
} as const

/**
 * Nexora edition: the personal-data policy of the instance and of its workspaces, read and set
 * by the instance organization's owners and admins from Réglages › Données personnelles.
 */
export const nexoraDataProtectionOperations = Object.freeze({
  // permission-group-exempt: instance administrators own the personal-data policy of the instance.
  read: defineOrganizationOperation({
    id: 'organization.nexora_data_protection.read',
    ...policy,
    capability: 'none',
  }),
  // permission-group-exempt: instance administrators own the personal-data policy of the instance.
  update: defineOrganizationOperation({
    id: 'organization.nexora_data_protection.update',
    ...policy,
    capability: 'none',
  }),
})
