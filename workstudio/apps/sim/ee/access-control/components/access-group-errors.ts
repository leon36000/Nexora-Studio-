// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { isApiClientError, isValidationError } from '@/lib/api/client/errors'

/** Why an access group change failed, as a `settings.accessGroups.errors` key. */
export function accessGroupErrorKey(
  error: unknown
): 'conflict' | 'forbidden' | 'invalid' | 'unknown' {
  if (isValidationError(error)) return 'invalid'
  if (!isApiClientError(error)) return 'unknown'
  if (error.status === 409) return 'conflict'
  if (error.status === 401 || error.status === 403) return 'forbidden'
  if (error.status === 400) return 'invalid'
  return 'unknown'
}
