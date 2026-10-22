// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { disabledUseCase } from '@/ee/_nexora/disabled'
import { accessRequestOperations as ops } from '@/ee/access-requests/lib/application/operations'

export const previewAccessRequest = disabledUseCase(ops.preview, 'Access requests')
export const resolveAccessRequest = disabledUseCase(ops.resolve, 'Access requests')
