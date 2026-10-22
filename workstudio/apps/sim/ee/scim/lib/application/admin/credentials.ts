// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { disabledUseCase } from '@/ee/_nexora/disabled'
import { scimOperations as ops } from '@/ee/scim/lib/application/operations'

export const issueScimCredential = disabledUseCase(ops.issueCredential, 'SCIM provisioning')
export const revokeScimCredential = disabledUseCase(ops.revokeCredential, 'SCIM provisioning')
