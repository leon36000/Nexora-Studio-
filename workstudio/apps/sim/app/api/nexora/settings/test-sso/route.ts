import { type NextRequest, NextResponse } from 'next/server'
import { testNexoraSsoContract } from '@/lib/api/contracts/nexora-settings'
import { parseRequest } from '@/lib/api/server'
import { env } from '@/lib/core/config/env'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { authorizeInstanceAdmin } from '@/lib/nexora/admin-access'
import { readInstanceSettings, settingsEnvironment } from '@/lib/nexora/instance-settings'
import { envOverrides } from '@/lib/nexora/instance-settings-env'
import { deniedResponse } from '@/lib/nexora/model-responses'
import { checkOidcDiscovery } from '@/lib/nexora/settings-checks'

export const dynamic = 'force-dynamic'

/**
 * Reads the identity provider's discovery document, as Better Auth will when WorkStudio starts:
 * the issuer on screen, else the one deploy/.env sets, else the stored one. Nothing is saved.
 */
export const POST = withRouteHandler(async (request: NextRequest) => {
  const access = await authorizeInstanceAdmin({ requireInstanceOrganization: true })
  if (!access.ok) return deniedResponse(access.status)
  const parsed = await parseRequest(testNexoraSsoContract, request, {})
  if (!parsed.success) return parsed.response

  const issuer = envOverrides(settingsEnvironment()).sso
    ? env.NEXORA_OIDC_ISSUER
    : parsed.data.body.issuer || (await readInstanceSettings())?.sso?.issuer
  if (!issuer) return NextResponse.json({ ok: false, reason: 'not-configured' })
  return NextResponse.json(await checkOidcDiscovery(issuer))
})
