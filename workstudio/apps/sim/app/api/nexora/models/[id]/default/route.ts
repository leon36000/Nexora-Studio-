import { createLogger } from '@sim/logger'
import { type NextRequest, NextResponse } from 'next/server'
import { setDefaultNexoraModelContract } from '@/lib/api/contracts/nexora-models'
import { parseRequest } from '@/lib/api/server'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { authorizeInstanceAdmin } from '@/lib/nexora/admin-access'
import { setDefaultNexoraModel } from '@/lib/nexora/model-admin'
import { deniedResponse, modelErrorResponse } from '@/lib/nexora/model-responses'

const logger = createLogger('NexoraModelsAPI')

interface RouteContext {
  params: Promise<{ id: string }>
}

/** Makes a model the default (`nexora-default`) for every block and template that follows it. */
export const POST = withRouteHandler(async (request: NextRequest, context: RouteContext) => {
  const access = await authorizeInstanceAdmin()
  if (!access.ok) return deniedResponse(access.status)
  const parsed = await parseRequest(setDefaultNexoraModelContract, request, context)
  if (!parsed.success) return parsed.response
  try {
    await setDefaultNexoraModel(parsed.data.params.id)
    logger.info('Default model changed', { id: parsed.data.params.id, userId: access.userId })
    return NextResponse.json({ success: true })
  } catch (error) {
    const response = modelErrorResponse(error)
    if (response) return response
    throw error
  }
})
