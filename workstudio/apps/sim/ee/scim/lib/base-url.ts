// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { getBaseUrl } from '@/lib/core/utils/urls'

export function scimBaseUrl(): string {
  return `${getBaseUrl()}/api/scim/v2`
}
