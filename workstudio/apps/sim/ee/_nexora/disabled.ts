// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import type { ApplicationOperation, OperationUseCase } from '@/lib/core/application/operation'
import { OrchestrationError } from '@/lib/core/orchestration/types'

export const NEXORA_FEATURE_DISABLED_MESSAGE = 'This feature is not available in this edition.'

/**
 * Raised by every disabled use case. It is a `not_found` orchestration error, so the core's
 * existing error policies render it as a 404 on both the internal and the v2 surfaces.
 */
export class FeatureDisabledError extends OrchestrationError {
  constructor(readonly feature: string) {
    super('not_found', `${feature}: ${NEXORA_FEATURE_DISABLED_MESSAGE}`)
    this.name = 'FeatureDisabledError'
  }
}

/** Minimal operation descriptor. Route builders only compare `id` with the use case's operation. */
export type DisabledOperation = ApplicationOperation & {
  readonly minimumRole: 'admin'
  readonly principalKinds: readonly ['session']
}

export function disabledOperation(id: string): DisabledOperation {
  return Object.freeze({
    id,
    capability: 'none',
    contentDelivery: 'none',
    minimumRole: 'admin',
    principalKinds: ['session'] as const,
  }) as DisabledOperation
}

export function disabledOperations<const K extends string>(
  prefix: string,
  keys: readonly K[]
): Readonly<Record<K, DisabledOperation>> {
  const out = {} as Record<K, DisabledOperation>
  for (const key of keys) out[key] = disabledOperation(`${prefix}.${key}`)
  return Object.freeze(out)
}

/** A use case whose `execute`/`authorize` always refuse with {@link FeatureDisabledError}. */
export type DisabledUseCase<R = any> = OperationUseCase<any, any, R>

export function disabledUseCase<R = any>(
  operation: ApplicationOperation,
  feature: string
): DisabledUseCase<R> {
  return Object.freeze({
    operation,
    async execute(): Promise<R> {
      throw new FeatureDisabledError(feature)
    },
    async authorize(): Promise<void> {
      throw new FeatureDisabledError(feature)
    },
  })
}

/** A use case that answers with a constant instead of refusing (feature-availability probes). */
export function constantUseCase<R>(operation: ApplicationOperation, value: () => R): DisabledUseCase {
  return Object.freeze({
    operation,
    async execute(): Promise<any> {
      return value()
    },
    async authorize(): Promise<void> {},
  })
}

/** Query-key factory used by the disabled client hooks (stable, namespaced, never fetched). */
export function nexoraKey(...parts: unknown[]): readonly unknown[] {
  return ['nexora-ee-disabled', ...parts] as const
}
