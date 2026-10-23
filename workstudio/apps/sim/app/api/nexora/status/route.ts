import { type NextRequest, NextResponse } from 'next/server'
import { getNexoraStatusContract } from '@/lib/api/contracts/nexora-status'
import { parseRequest } from '@/lib/api/server'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { authorizeInstanceAdmin } from '@/lib/nexora/admin-access'
import { readInstanceStatus } from '@/lib/nexora/instance-status'
import { deniedResponse } from '@/lib/nexora/model-responses'

export const dynamic = 'force-dynamic'

/**
 * Raw route: it checks the services of the instance itself (database, Nexora API, Nexora
 * Connect…) and touches no workspace or organization data, so there is no application operation.
 * The status describes the whole instance, so only its admins may read it.
 */
export const GET = withRouteHandler(async (request: NextRequest) => {
  const access = await authorizeInstanceAdmin({ requireInstanceOrganization: true })
  if (!access.ok) return deniedResponse(access.status)
  const parsed = await parseRequest(getNexoraStatusContract, request, {})
  if (!parsed.success) return parsed.response
  return NextResponse.json(await readInstanceStatus())
})
