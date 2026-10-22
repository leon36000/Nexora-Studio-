// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { disabledUseCase } from '@/ee/_nexora/disabled'
import { scimOperations as ops } from '@/ee/scim/lib/application/operations'

export const replaceScimUser = disabledUseCase(ops.replaceUser, 'SCIM provisioning')
export const patchScimUser = disabledUseCase(ops.patchUser, 'SCIM provisioning')
