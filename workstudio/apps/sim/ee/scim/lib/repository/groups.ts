// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { FeatureDisabledError } from '@/ee/_nexora/disabled'

export async function insertScimGroup(_db: unknown, _values: Record<string, unknown>): Promise<any> {
  throw new FeatureDisabledError('SCIM provisioning')
}
