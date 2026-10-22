// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { FeatureDisabledError } from '@/ee/_nexora/disabled'

/** Inserts a SCIM group row; core fixtures read back its `id` and `displayName`. */
export async function insertScimGroup(
  _db: unknown,
  _values: Record<string, unknown>
): Promise<{ id: string; displayName: string }> {
  throw new FeatureDisabledError('SCIM provisioning')
}
