import { createLogger } from '@sim/logger'
import { type NextRequest, NextResponse } from 'next/server'
import { addNexoraModelContract } from '@/lib/api/contracts/nexora-models'
import { parseRequest } from '@/lib/api/server'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { authorizeInstanceAdmin } from '@/lib/nexora/admin-access'
import { addNexoraModel, listNexoraModels } from '@/lib/nexora/model-admin'
import { deniedResponse, modelErrorResponse } from '@/lib/nexora/model-responses'
import { listLocalModels, OLLAMA_CATALOG } from '@/lib/nexora/ollama'

const logger = createLogger('NexoraModelsAPI')

export const dynamic = 'force-dynamic'

/**
 * Raw routes: they administer an external service (Nexora API, the bundled Ollama) and touch no
 * workspace or organization data, so there is no application operation. The models serve every
 * user of the instance, so only instance admins may change them.
 */
export const GET = withRouteHandler(async (_request: NextRequest) => {
  const access = await authorizeInstanceAdmin({ requireInstanceOrganization: true })
  if (!access.ok) return deniedResponse(access.status)
  try {
    const [models, localModels] = await Promise.all([
      listNexoraModels(),
      listLocalModels().catch((error: unknown) => {
        logger.warn('The bundled Ollama is unavailable', { error })
        return null
      }),
    ])
    const installed = new Set(localModels ?? [])
    return NextResponse.json({
      models,
      catalog: OLLAMA_CATALOG.map((model) => ({ ...model, installed: installed.has(model.name) })),
      localModels: localModels ?? [],
      ollamaAvailable: localModels !== null,
    })
  } catch (error) {
    const response = modelErrorResponse(error)
    if (response) return response
    throw error
  }
})

export const POST = withRouteHandler(async (request: NextRequest) => {
  const access = await authorizeInstanceAdmin({ requireInstanceOrganization: true })
  if (!access.ok) return deniedResponse(access.status)
  const parsed = await parseRequest(addNexoraModelContract, request, {})
  if (!parsed.success) return parsed.response
  try {
    const model = await addNexoraModel(parsed.data.body)
    logger.info('Model added', { name: model.name, source: model.source, userId: access.userId })
    return NextResponse.json({ model })
  } catch (error) {
    const response = modelErrorResponse(error)
    if (!response) throw error
    logger.warn('Model not added', { source: parsed.data.body.source, error })
    return response
  }
})
