import { type NextRequest, NextResponse } from 'next/server'
import { nexoraUsageQuerySchema } from '@/lib/api/contracts/nexora-usage'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { authorizeInstanceAdmin } from '@/lib/nexora/admin-access'
import { fetchNexoraApiUsage, NexoraUsageUnavailableError } from '@/lib/nexora/usage'

export const dynamic = 'force-dynamic'

/**
 * Raw route: it reads an instance-level metric from an external service (Nexora API)
 * and touches no workspace or organization data, so there is no application operation.
 * The figures cover every user of the instance, so only instance admins may read them.
 */
export const GET = withRouteHandler(async (request: NextRequest) => {
  const access = await authorizeInstanceAdmin()
  if (!access.ok) {
    return NextResponse.json(
      { error: access.status === 401 ? 'Unauthorized' : 'Forbidden' },
      { status: access.status }
    )
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
