// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { disabledUseCase } from '@/ee/_nexora/disabled'
import { scimOperations as ops } from '@/ee/scim/lib/application/operations'

export const getScimConnection = disabledUseCase(ops.getConnection, 'SCIM provisioning')
export const configureScimConnection = disabledUseCase(ops.configureConnection, 'SCIM provisioning')
export const listScimActivity = disabledUseCase(ops.listActivity, 'SCIM provisioning')
export const reconcileScimConnection = disabledUseCase(ops.reconcileConnection, 'SCIM provisioning')
