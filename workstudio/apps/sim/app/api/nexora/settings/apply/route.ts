import { type NextRequest, NextResponse } from 'next/server'
import { applyNexoraSettingsContract } from '@/lib/api/contracts/nexora-settings'
import { parseRequest } from '@/lib/api/server'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { authorizeInstanceAdmin } from '@/lib/nexora/admin-access'
import { readInstanceSettings, recordSettingsApplied } from '@/lib/nexora/instance-settings'
import { deniedResponse } from '@/lib/nexora/model-responses'
import { isRestartSupervised, scheduleGracefulRestart } from '@/lib/nexora/restart'

export const dynamic = 'force-dynamic'

/**
 * « Appliquer »: single sign-on, e-mail and sign-up domains are read when WorkStudio starts, so
 * applying them restarts it. The answer goes out first; the server then stops gracefully and the
 * container comes back by itself (~20 s) while the screen waits on `/api/health`.
 */
export const POST = withRouteHandler(async (request: NextRequest) => {
  const access = await authorizeInstanceAdmin({ requireInstanceOrganization: true })
  if (!access.ok) return deniedResponse(access.status)
  const parsed = await parseRequest(applyNexoraSettingsContract, request, {})
  if (!parsed.success) return parsed.response
  if (!isRestartSupervised()) {
    return NextResponse.json({ error: 'not-supervised' }, { status: 409 })
  }
  const stored = await readInstanceSettings()
  recordSettingsApplied(
    { userId: access.userId, organizationId: access.organizationId, request },
    stored?.revision ?? 0
  )
  scheduleGracefulRestart()
  return NextResponse.json({ restarting: true })
})
