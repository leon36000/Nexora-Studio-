import { type NextRequest, NextResponse } from 'next/server'
import { pullOllamaModelContract } from '@/lib/api/contracts/nexora-models'
import { parseRequest } from '@/lib/api/server'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { authorizeInstanceAdmin } from '@/lib/nexora/admin-access'
import { deniedResponse, modelErrorResponse } from '@/lib/nexora/model-responses'
import { pullLocalModel } from '@/lib/nexora/ollama'

export const dynamic = 'force-dynamic'

/**
 * Raw streaming route: downloads a model into the bundled Ollama and streams its progress
 * (`data: {...}` events). Closing the page stops the download.
 */
export const POST = withRouteHandler(async (request: NextRequest) => {
  const access = await authorizeInstanceAdmin({ requireInstanceOrganization: true })
  if (!access.ok) return deniedResponse(access.status)
  const parsed = await parseRequest(pullOllamaModelContract, request, {})
  if (!parsed.success) return parsed.response
  try {
    const stream = await pullLocalModel(parsed.data.body.model, { signal: request.signal })
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
      },
    })
  } catch (error) {
    const response = modelErrorResponse(error)
    if (response) return response
    throw error
  }
})
