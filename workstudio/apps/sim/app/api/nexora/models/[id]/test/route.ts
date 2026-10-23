import { type NextRequest, NextResponse } from 'next/server'
import { testNexoraModelContract } from '@/lib/api/contracts/nexora-models'
import { parseRequest } from '@/lib/api/server'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { authorizeInstanceAdmin } from '@/lib/nexora/admin-access'
import { listNexoraModels, testNexoraModel } from '@/lib/nexora/model-admin'
import { deniedResponse, modelErrorResponse } from '@/lib/nexora/model-responses'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * Tries a model by the name blocks use, on its own kind of input (a question, a sample image, a
 * second of sound), and times the answer.
 */
export const POST = withRouteHandler(async (request: NextRequest, context: RouteContext) => {
  const access = await authorizeInstanceAdmin({ requireInstanceOrganization: true })
  if (!access.ok) return deniedResponse(access.status)
  const parsed = await parseRequest(testNexoraModelContract, request, context)
  if (!parsed.success) return parsed.response
  try {
    const model = (await listNexoraModels()).find((m) => m.id === parsed.data.params.id)
    if (!model) return NextResponse.json({ error: 'not-found' }, { status: 404 })
    return NextResponse.json(await testNexoraModel(model.name, {}, model.usage))
  } catch (error) {
    const response = modelErrorResponse(error)
    if (response) return response
    throw error
  }
})
