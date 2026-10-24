import type { NextRequest } from 'next/server'
import { nexoraModelContract } from '@/lib/api/contracts/nexora-openai'
import { parseRequest } from '@/lib/api/server'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { authenticateGatewayCall } from '@/lib/nexora/developer-api/gateway'
import { retrieveGatewayModel } from '@/lib/nexora/developer-api/models'
import { answerGateway, gatewayParseOptions } from '@/app/api/nexora/v1/surface'

export const dynamic = 'force-dynamic'

/** `GET /v1/models/{model}`. */
export const GET = withRouteHandler(
  (request: NextRequest, context: { params: Promise<{ model: string }> }) =>
    answerGateway(async () => {
      const call = await authenticateGatewayCall(request)
      const parsed = await parseRequest(nexoraModelContract, request, context, gatewayParseOptions)
      if (!parsed.success) return parsed.response
      const model = await retrieveGatewayModel(call, parsed.data.params.model)
      return Response.json(model, { headers: call.headers })
    })
)
