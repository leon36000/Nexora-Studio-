import { createLogger } from '@sim/logger'
import { type NextRequest, NextResponse } from 'next/server'
import { removeNexoraModelContract } from '@/lib/api/contracts/nexora-models'
import { parseRequest } from '@/lib/api/server'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { authorizeInstanceAdmin } from '@/lib/nexora/admin-access'
import { removeNexoraModel } from '@/lib/nexora/model-admin'
import { deniedResponse, modelErrorResponse } from '@/lib/nexora/model-responses'
import { deleteLocalModel } from '@/lib/nexora/ollama'

const logger = createLogger('NexoraModelsAPI')

interface RouteContext {
  params: Promise<{ id: string }>
}

/** Removes a model; its file in the bundled Ollama goes too when no other model uses it. */
export const DELETE = withRouteHandler(async (request: NextRequest, context: RouteContext) => {
  const access = await authorizeInstanceAdmin()
  if (!access.ok) return deniedResponse(access.status)
  const parsed = await parseRequest(removeNexoraModelContract, request, context)
  if (!parsed.success) return parsed.response
  try {
    const { removedLocalModel } = await removeNexoraModel(parsed.data.params.id)
    let deleted: string | null = null
    if (removedLocalModel) {
      deleted = await deleteLocalModel(removedLocalModel)
        .then(() => removedLocalModel)
        .catch((error: unknown) => {
          logger.warn('Local model file kept', { model: removedLocalModel, error })
          return null
        })
    }
    logger.info('Model removed', { id: parsed.data.params.id, userId: access.userId })
    return NextResponse.json({ success: true, removedLocalModel: deleted })
  } catch (error) {
    const response = modelErrorResponse(error)
    if (response) return response
    throw error
  }
})
