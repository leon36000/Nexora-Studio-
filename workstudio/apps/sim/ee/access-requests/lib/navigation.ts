// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { ACCESS_REQUEST_CANONICAL_VIEW } from '@/ee/access-requests/components/search-params'
import type { AccessRequestScope } from '@/ee/access-requests/lib/targets'

export function getAccessRequestsSettingsHref(scope: AccessRequestScope): string {
  return scope.kind === 'workspace'
    ? `/workspace/${encodeURIComponent(scope.workspaceId)}/settings/general`
    : `/o/${encodeURIComponent(scope.organizationId)}/settings/general`
}

export function getMyAccessRequestHref(scope: AccessRequestScope, _requestId?: string): string {
  return getAccessRequestsSettingsHref(scope)
}

/** No legacy request query is recognized: callers keep the section they resolved. */
export function getLegacyAccessRequestsQuery(
  _section: string,
  _params: Record<string, string | string[] | undefined>
): URLSearchParams | null {
  return null
}

/**
 * The canonical query a legacy access-request entry normalizes to. The standalone page redirects
 * whenever its parsed `view` differs from the raw one, so the normalized URL must carry the
 * canonical view explicitly or the redirect would never settle. No other legacy state is kept.
 */
export function getLegacyAccessRequestsSettingsQuery(
  _params: Record<string, string | string[] | undefined>
): string {
  return `?view=${ACCESS_REQUEST_CANONICAL_VIEW}`
}
