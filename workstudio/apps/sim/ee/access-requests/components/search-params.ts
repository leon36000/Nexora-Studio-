// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { parseAsString, parseAsStringLiteral } from 'nuqs/server'

/**
 * Views the standalone `/access-requests` entry recognizes. `admin` is the legacy review view the
 * page normalizes away; `mine` is the canonical view the normalized URL carries. Any other value
 * parses to `null`, so the page drops it instead of forwarding raw query parameters.
 */
export const ACCESS_REQUEST_ENTRY_VIEWS = ['mine', 'admin'] as const
export const ACCESS_REQUEST_CANONICAL_VIEW =
  'mine' satisfies (typeof ACCESS_REQUEST_ENTRY_VIEWS)[number]

export const accessRequestEntrySearchParams = {
  organizationId: parseAsString,
  view: parseAsStringLiteral(ACCESS_REQUEST_ENTRY_VIEWS),
}
