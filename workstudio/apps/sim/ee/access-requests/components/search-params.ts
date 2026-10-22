// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { parseAsString } from 'nuqs/server'

export const accessRequestEntrySearchParams = {
  organizationId: parseAsString,
  view: parseAsString,
}
