import { type NextRequest, NextResponse } from 'next/server'
import { updateNexoraCodeExecutionContract } from '@/lib/api/contracts/nexora-code-execution'
import { parseRequest } from '@/lib/api/server'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import {
  checkCodeSandboxHealth,
  isCodeSandboxConfigured,
} from '@/lib/execution/remote-sandbox/nexora'
import { authorizeInstanceAdmin } from '@/lib/nexora/admin-access'
import { readCodeExecutionSetting, updateCodeExecutionSetting } from '@/lib/nexora/code-execution'
import { deniedResponse } from '@/lib/nexora/model-responses'

export const dynamic = 'force-dynamic'

async function present(stored: { enabled: boolean; updatedAt?: string }) {
  const configured = isCodeSandboxConfigured()
  const health = configured ? await checkCodeSandboxHealth() : { reachable: false }
  return NextResponse.json({
    configured,
    enabled: configured && stored.enabled,
    reachable: health.reachable,
    ...(stored.updatedAt ? { updatedAt: stored.updatedAt } : {}),
    ...('limits' in health && health.limits ? { limits: health.limits } : {}),
  })
}

/**
 * Raw routes: running AI-written code is an instance decision, so only the instance
 * organization's administrators read or change it (Réglages › Exécution de code).
 */
export const GET = withRouteHandler(async (_request: NextRequest) => {
  const access = await authorizeInstanceAdmin({ requireInstanceOrganization: true })
  if (!access.ok) return deniedResponse(access.status)
  return present(await readCodeExecutionSetting(access.organizationId))
})

export const PUT = withRouteHandler(async (request: NextRequest) => {
  const access = await authorizeInstanceAdmin({ requireInstanceOrganization: true })
  if (!access.ok) return deniedResponse(access.status)
  const parsed = await parseRequest(updateNexoraCodeExecutionContract, request, {})
  if (!parsed.success) return parsed.response
  const { enabled } = parsed.data.body
  if (enabled && !isCodeSandboxConfigured()) {
    return NextResponse.json({ error: 'not-installed' }, { status: 409 })
  }
  const stored = await updateCodeExecutionSetting(enabled, {
    userId: access.userId,
    organizationId: access.organizationId,
    request,
  })
  return present(stored)
})
