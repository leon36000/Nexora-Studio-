// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

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

export function getLegacyAccessRequestsSettingsQuery(
  _params: Record<string, string | string[] | undefined>
): string {
  return ''
}
