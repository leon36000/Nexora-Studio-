// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import type { ApplicationOperation } from '@/lib/core/application/operation'
import { type DisabledUseCase, disabledUseCase } from '@/ee/_nexora/disabled'

export function defineForkUseCase(definition: {
  operation: ApplicationOperation
  [key: string]: unknown
}): DisabledUseCase {
  return disabledUseCase(definition.operation, 'Workspace forking')
}
