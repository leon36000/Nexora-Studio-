import { type NextRequest, NextResponse } from 'next/server'
import { getNexoraHomeContract } from '@/lib/api/contracts/nexora-home'
import { parseRequest } from '@/lib/api/server'
import { getSession } from '@/lib/auth'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { hasEmailService } from '@/lib/messaging/email/mailer'
import { authorizeInstanceAdmin } from '@/lib/nexora/admin-access'
import { fetchModelStatus } from '@/lib/nexora/default-model'
import { readOnboarding } from '@/lib/nexora/onboarding'
import { resolvePersonModel } from '@/lib/nexora/person-model'

export const dynamic = 'force-dynamic'

/**
 * Raw route: the default model comes from an external service (Nexora API) and the first-launch
 * progress is instance-level, so there is no workspace operation. Every signed-in user sees the
 * default model's name and which model usages have a model (booleans read with WorkStudio's own
 * model key); only instance admins get the first-launch progress. With the site's gateway the default
 * model is the one the person's own key gives, never the instance's.
 */
export const GET = withRouteHandler(async (request: NextRequest) => {
  const access = await authorizeInstanceAdmin()
  if (!access.ok && access.status === 401) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const parsed = await parseRequest(getNexoraHomeContract, request, {})
  if (!parsed.success) return parsed.response
  const userId = access.ok ? access.userId : ((await getSession())?.user?.id ?? null)
  const [models, onboarding, person] = await Promise.all([
    fetchModelStatus(),
    access.ok ? readOnboarding(access.organizationId) : Promise.resolve(null),
    resolvePersonModel(userId),
  ])
  return NextResponse.json({
    defaultModel: person.defaultModel === undefined ? models.defaultModel : person.defaultModel,
    modelUsages: models.usages,
    isInstanceAdmin: access.ok,
    onboarding,
    organizationId: access.ok ? access.organizationId : null,
    emailConfigured: hasEmailService(),
    viaSite: person.viaSite,
  })
})
