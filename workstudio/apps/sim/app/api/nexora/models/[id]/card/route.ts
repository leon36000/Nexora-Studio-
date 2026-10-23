import { type NextRequest, NextResponse } from 'next/server'
import { updateNexoraModelCardContract } from '@/lib/api/contracts/nexora-models'
import { parseRequest } from '@/lib/api/server'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { authorizeInstanceAdmin } from '@/lib/nexora/admin-access'
import { listNexoraModels } from '@/lib/nexora/model-admin'
import { resolveModelCard, updateModelCard } from '@/lib/nexora/model-cards'
import { deniedResponse, modelErrorResponse } from '@/lib/nexora/model-responses'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * Declares what « Tester » cannot find out: a model's context length, and where an
 * OpenAI-compatible service keeps the data (a local model stays on this server, Mistral AI in the
 * EU). Instance admins only, like every model change.
 */
export const PATCH = withRouteHandler(async (request: NextRequest, context: RouteContext) => {
  const access = await authorizeInstanceAdmin({ requireInstanceOrganization: true })
  if (!access.ok) return deniedResponse(access.status)
  const parsed = await parseRequest(updateNexoraModelCardContract, request, context)
  if (!parsed.success) return parsed.response
  try {
    const model = (await listNexoraModels()).find((m) => m.id === parsed.data.params.id)
    if (!model) return NextResponse.json({ error: 'not-found' }, { status: 404 })
    const { location, contextTokens } = parsed.data.body
    if (location !== undefined && model.source !== 'openai-compatible') {
      return NextResponse.json({ error: 'invalid' }, { status: 400 })
    }
    const stored = await updateModelCard(access.organizationId, model.name, {
      ...(location === undefined ? {} : { location }),
      ...(contextTokens === undefined ? {} : { contextTokens }),
    })
    return NextResponse.json({ card: resolveModelCard(model, stored ?? undefined) })
  } catch (error) {
    const response = modelErrorResponse(error)
    if (response) return response
    throw error
  }
})
