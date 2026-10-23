import { type NextRequest, NextResponse } from 'next/server'
import { getNexoraHomeContract } from '@/lib/api/contracts/nexora-home'
import { parseRequest } from '@/lib/api/server'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { hasEmailService } from '@/lib/messaging/email/mailer'
import { authorizeInstanceAdmin } from '@/lib/nexora/admin-access'
import { fetchModelStatus } from '@/lib/nexora/default-model'
import { readOnboarding } from '@/lib/nexora/onboarding'

export const dynamic = 'force-dynamic'

/**
 * Raw route: the default model comes from an external service (Nexora API) and the first-launch
 * progress is instance-level, so there is no workspace operation. Every signed-in user sees the
 * default model's name and which model usages have a model (booleans read with WorkStudio's own
 * model key); only instance admins get the first-launch progress.
 */
export const GET = withRouteHandler(async (request: NextRequest) => {
  const access = await authorizeInstanceAdmin()
  if (!access.ok && access.status === 401) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const parsed = await parseRequest(getNexoraHomeContract, request, {})
  if (!parsed.success) return parsed.response
  const [models, onboarding] = await Promise.all([
    fetchModelStatus(),
    access.ok ? readOnboarding(access.organizationId) : Promise.resolve(null),
  ])
  return NextResponse.json({
    defaultModel: models.defaultModel,
    modelUsages: models.usages,
    isInstanceAdmin: access.ok,
    onboarding,
    organizationId: access.ok ? access.organizationId : null,
    emailConfigured: hasEmailService(),
  })
})
