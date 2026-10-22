// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { disabledUseCase } from '@/ee/_nexora/disabled'
import { scimOperations as ops } from '@/ee/scim/lib/application/operations'

export const listScimGroupMappings = disabledUseCase(ops.listMappings, 'SCIM provisioning')
export const upsertScimGroupMapping = disabledUseCase(ops.upsertMapping, 'SCIM provisioning')
export const deleteScimGroupMapping = disabledUseCase(ops.deleteMapping, 'SCIM provisioning')
