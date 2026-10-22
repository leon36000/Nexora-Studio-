// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { disabledUseCase } from '@/ee/_nexora/disabled'
import { scimOperations as ops } from '@/ee/scim/lib/application/operations'

export const listScimGroups = disabledUseCase(ops.listGroups, 'SCIM provisioning')
export const getScimGroup = disabledUseCase(ops.getGroup, 'SCIM provisioning')
export const createScimGroup = disabledUseCase(ops.createGroup, 'SCIM provisioning')
export const replaceScimGroup = disabledUseCase(ops.replaceGroup, 'SCIM provisioning')
export const patchScimGroup = disabledUseCase(ops.patchGroup, 'SCIM provisioning')
export const deleteScimGroup = disabledUseCase(ops.deleteGroup, 'SCIM provisioning')
