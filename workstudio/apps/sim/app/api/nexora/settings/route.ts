import { type NextRequest, NextResponse } from 'next/server'
import { updateNexoraSettingsContract } from '@/lib/api/contracts/nexora-settings'
import { parseRequest } from '@/lib/api/server'
import { getBaseUrl } from '@/lib/core/utils/urls'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { authorizeInstanceAdmin } from '@/lib/nexora/admin-access'
import {
  publicSettings,
  readInstanceSettings,
  type StoredInstanceSettings,
  saveInstanceSettings,
  settingsEnvironment,
} from '@/lib/nexora/instance-settings'
import { envOverrides } from '@/lib/nexora/instance-settings-env'
import { deniedResponse } from '@/lib/nexora/model-responses'
import { NEXORA_OIDC_PROVIDER_ID } from '@/lib/nexora/oidc'

export const dynamic = 'force-dynamic'

/**
 * Single sign-on decides who can become whom: an identity provider that asserts a verified
 * address can sign in as that account. Only the owner, who already holds the instance, sets it;
 * admins see it read-only.
 */
function canEditSso(role: string): boolean {
  return role === 'owner'
}

function present(stored: StoredInstanceSettings, role: string) {
  return NextResponse.json({
    ...publicSettings(stored, settingsEnvironment()),
    canEditSso: canEditSso(role),
    redirectUri: `${getBaseUrl()}/api/auth/oauth2/callback/${NEXORA_OIDC_PROVIDER_ID}`,
  })
}

function unavailable() {
  return NextResponse.json({ error: 'unavailable' }, { status: 503 })
}

/**
 * Raw routes: the instance settings (single sign-on, e-mail, sign-up domains) belong to no
 * workspace; they live in the instance organization and only its admins read or change them.
 * Secrets never leave the server: the view says whether one is set.
 */
export const GET = withRouteHandler(async (_request: NextRequest) => {
  const access = await authorizeInstanceAdmin({ requireInstanceOrganization: true })
  if (!access.ok) return deniedResponse(access.status)
  const stored = await readInstanceSettings()
  return stored ? present(stored, access.role) : unavailable()
})

export const PUT = withRouteHandler(async (request: NextRequest) => {
  const access = await authorizeInstanceAdmin({ requireInstanceOrganization: true })
  if (!access.ok) return deniedResponse(access.status)
  const parsed = await parseRequest(updateNexoraSettingsContract, request, {})
  if (!parsed.success) return parsed.response
  const change = parsed.data.body

  // deploy/.env wins: a group it sets is read-only here, not silently shadowed.
  const overrides = envOverrides(settingsEnvironment())
  if (
    (overrides.sso && change.sso !== undefined) ||
    (overrides.smtp && change.smtp !== undefined) ||
    (overrides.domains && change.allowedDomains !== undefined)
  ) {
    return NextResponse.json({ error: 'env-override' }, { status: 409 })
  }
  if (change.sso !== undefined && !canEditSso(access.role)) {
    return NextResponse.json({ error: 'owner-only' }, { status: 403 })
  }

  const next = await saveInstanceSettings(change, {
    userId: access.userId,
    organizationId: access.organizationId,
    request,
  })
  return next ? present(next, access.role) : unavailable()
})
