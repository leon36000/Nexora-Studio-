// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { FeatureDisabledError } from '@/ee/_nexora/disabled'

/** Inserts a SCIM user row; core fixtures read back its `id`. */
export async function insertScimUser(
  _db: unknown,
  _values: Record<string, unknown>
): Promise<{ id: string }> {
  throw new FeatureDisabledError('SCIM provisioning')
}
