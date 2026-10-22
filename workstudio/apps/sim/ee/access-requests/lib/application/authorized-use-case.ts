// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import type { ApplicationOperation } from '@/lib/core/application/operation'
import { type DisabledUseCase, disabledUseCase } from '@/ee/_nexora/disabled'

/** Any access-request use case defined through this factory is disabled. */
export function defineAuthorizedAccessRequestUseCase(definition: {
  operation: ApplicationOperation
  [key: string]: unknown
}): DisabledUseCase {
  return disabledUseCase(definition.operation, 'Access requests')
}
