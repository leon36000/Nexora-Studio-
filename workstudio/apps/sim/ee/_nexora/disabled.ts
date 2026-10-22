// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import type { OAuthApiScope } from '@/lib/auth/oauth-provider'
import type { ApplicationOperation, OperationUseCase } from '@/lib/core/application/operation'
import { OrchestrationError } from '@/lib/core/orchestration/types'

const NEXORA_FEATURE_DISABLED_MESSAGE = 'This feature is not available in this edition.'

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

/**
 * Minimal operation descriptor. Route builders only compare `id` with the use case's operation;
 * the OpenAPI generator also reads `oauthScope`, which the core requires exactly when the
 * operation admits OAuth access tokens (see `assertOperationOAuthPolicy`).
 */
export type DisabledOperation = ApplicationOperation & {
  readonly minimumRole: 'admin'
  readonly principalKinds: readonly ('session' | 'oauth_access_token')[]
}

export function disabledOperation(id: string, oauthScope?: OAuthApiScope): DisabledOperation {
  return Object.freeze({
    id,
    capability: 'none',
    contentDelivery: 'none',
    minimumRole: 'admin',
    ...(oauthScope
      ? { oauthScope, principalKinds: ['session', 'oauth_access_token'] as const }
      : { principalKinds: ['session'] as const }),
  })
}

function toSnakeCase(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
}

/**
 * Operations keyed in camelCase with core snake_case ids (`access_requests.list_mine`). An
 * operation published on the v2 API carries the OAuth scope its published OpenAPI entry declares.
 */
export function disabledOperations<const K extends string>(
  prefix: string,
  keys: readonly K[],
  oauthScopes: Partial<Record<K, OAuthApiScope>> = {}
): Readonly<Record<K, DisabledOperation>> {
  const out = {} as Record<K, DisabledOperation>
  for (const key of keys) {
    out[key] = disabledOperation(`${prefix}.${toSnakeCase(key)}`, oauthScopes[key])
  }
  return Object.freeze(out)
}

/**
 * A disabled use case. It accepts any input (`unknown`) and its result type `R` is what the core
 * caller reads from the real use case; it defaults to `never` because `execute` never resolves.
 */
export type DisabledUseCase<
  R = never,
  O extends ApplicationOperation = DisabledOperation,
> = OperationUseCase<O, unknown, R>

/** A use case whose `execute`/`authorize` always refuse with {@link FeatureDisabledError}. */
export function disabledUseCase<R = never, O extends ApplicationOperation = DisabledOperation>(
  operation: O,
  feature: string
): DisabledUseCase<R, O> {
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
export function constantUseCase<R>(
  operation: DisabledOperation,
  value: () => R
): DisabledUseCase<R> {
  return Object.freeze({
    operation,
    async execute(): Promise<R> {
      return value()
    },
    async authorize(): Promise<void> {},
  })
}

/** Query-key factory used by the disabled client hooks (stable, namespaced, never fetched). */
export function nexoraKey(...parts: unknown[]): readonly unknown[] {
  return ['nexora-ee-disabled', ...parts] as const
}
