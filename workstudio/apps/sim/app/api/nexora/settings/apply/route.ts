import { type NextRequest, NextResponse } from 'next/server'
import { applyNexoraSettingsContract } from '@/lib/api/contracts/nexora-settings'
import { parseRequest } from '@/lib/api/server'
import { isNexoraOidcRequired } from '@/lib/core/config/env-flags'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { authorizeInstanceAdmin } from '@/lib/nexora/admin-access'
import {
  isSsoRequiredAfterApply,
  publicSettings,
  readInstanceSettings,
  recordSettingsApplied,
  revokeMemberSessions,
  settingsEnvironment,
} from '@/lib/nexora/instance-settings'
import { deniedResponse } from '@/lib/nexora/model-responses'
import {
  isRestartInProgress,
  isRestartSupervised,
  scheduleGracefulRestart,
} from '@/lib/nexora/restart'

export const dynamic = 'force-dynamic'

/**
 * « Appliquer »: single sign-on, e-mail and sign-up domains are read when WorkStudio starts, so
 * applying them restarts it. The answer goes out first; the server then stops gracefully and the
 * container comes back by itself (~20 s) while the screen waits on `/api/health`. Refused while a
 * restart is under way or when no saved change is waiting; when single sign-on becomes required,
 * the members' open sessions are ended first (sessions cannot tell how they were opened, so all of
 * a member's go; owners and admins keep theirs).
 */
export const POST = withRouteHandler(async (request: NextRequest) => {
  const access = await authorizeInstanceAdmin({ requireInstanceOrganization: true })
  if (!access.ok) return deniedResponse(access.status)
  const parsed = await parseRequest(applyNexoraSettingsContract, request, {})
  if (!parsed.success) return parsed.response
  if (!isRestartSupervised()) {
    return NextResponse.json({ error: 'not-supervised' }, { status: 409 })
  }
  if (isRestartInProgress()) {
    return NextResponse.json({ error: 'restart-in-progress' }, { status: 409 })
  }
  const stored = await readInstanceSettings()
  const environment = settingsEnvironment()
  if (!stored || !publicSettings(stored, environment).pendingApply) {
    return NextResponse.json({ error: 'nothing-pending' }, { status: 409 })
  }
  // « Connexion obligatoire » turning on: members' open password sessions end with the restart.
  if (!isNexoraOidcRequired && isSsoRequiredAfterApply(stored, environment)) {
    await revokeMemberSessions(access.organizationId)
  }
  if (!scheduleGracefulRestart()) {
    return NextResponse.json({ error: 'restart-in-progress' }, { status: 409 })
  }
  recordSettingsApplied(
    { userId: access.userId, organizationId: access.organizationId, request },
    stored.revision ?? 0
  )
  return NextResponse.json({ restarting: true })
})
