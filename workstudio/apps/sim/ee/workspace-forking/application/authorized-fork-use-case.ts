// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import type { ApplicationOperation } from '@/lib/core/application/operation'
import { type DisabledUseCase, disabledUseCase } from '@/ee/_nexora/disabled'

/**
 * Any fork use case defined through this factory is disabled; `execute` is never called.
 * Its argument mirrors the core's private-transport tests, which read the request `context`.
 */
export function defineForkUseCase(definition: {
  operation: ApplicationOperation
  execute?: (args: { context: unknown }) => Promise<unknown>
  [key: string]: unknown
}): DisabledUseCase<never, ApplicationOperation> {
  return disabledUseCase<never, ApplicationOperation>(definition.operation, 'Workspace forking')
}
