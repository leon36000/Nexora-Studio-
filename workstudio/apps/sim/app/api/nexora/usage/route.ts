import { isOrgAdminRole } from '@sim/platform-authz/workspace'
import { type NextRequest, NextResponse } from 'next/server'
import { nexoraUsageQuerySchema } from '@/lib/api/contracts/nexora-usage'
import { getSession } from '@/lib/auth'
import { getUserOrganization } from '@/lib/billing/organizations/membership'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { fetchNexoraApiUsage, NexoraUsageUnavailableError } from '@/lib/nexora/usage'
import { getInstanceOrganizationId } from '@/lib/organizations/instance-org'

export const dynamic = 'force-dynamic'

/**
 * Raw route: it reads an instance-level metric from an external service (Nexora API)
 * and touches no workspace or organization data, so there is no application operation.
 * The figures cover every user of the instance, so only organization owners and admins
 * may read them — of the instance organization when the instance has one, since every
 * user belongs to it and nobody can found another.
 */
export const GET = withRouteHandler(async (request: NextRequest) => {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const [membership, instanceOrganizationId] = await Promise.all([
    getUserOrganization(session.user.id),
    getInstanceOrganizationId(),
  ])
  if (
    !membership ||
    !isOrgAdminRole(membership.role) ||
    (instanceOrganizationId && membership.organizationId !== instanceOrganizationId)
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { days } = nexoraUsageQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams))
  try {
    return NextResponse.json(await fetchNexoraApiUsage({ days }))
  } catch (error) {
    if (error instanceof NexoraUsageUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    throw error
  }
})
