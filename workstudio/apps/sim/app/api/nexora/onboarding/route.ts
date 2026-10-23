import { type NextRequest, NextResponse } from 'next/server'
import { updateNexoraOnboardingContract } from '@/lib/api/contracts/nexora-home'
import { parseRequest } from '@/lib/api/server'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { authorizeInstanceAdmin } from '@/lib/nexora/admin-access'
import { deniedResponse } from '@/lib/nexora/model-responses'
import { updateOnboarding } from '@/lib/nexora/onboarding'

/** Records a first-launch step or hides/shows the panel (instance admins only). */
export const PATCH = withRouteHandler(async (request: NextRequest) => {
  const access = await authorizeInstanceAdmin()
  if (!access.ok) return deniedResponse(access.status)
  const parsed = await parseRequest(updateNexoraOnboardingContract, request, {})
  if (!parsed.success) return parsed.response
  const onboarding = await updateOnboarding(access.organizationId, parsed.data.body)
  return NextResponse.json({ onboarding })
})
