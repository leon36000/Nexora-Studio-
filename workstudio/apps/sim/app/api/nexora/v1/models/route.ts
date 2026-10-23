import type { NextRequest } from 'next/server'
import { nexoraModelsContract } from '@/lib/api/contracts/nexora-openai'
import { parseRequest } from '@/lib/api/server'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { authenticateGatewayCall } from '@/lib/nexora/developer-api/gateway'
import { listGatewayModels } from '@/lib/nexora/developer-api/models'
import { answerGateway, gatewayParseOptions } from '@/app/api/nexora/v1/surface'

export const dynamic = 'force-dynamic'

/** `GET /v1/models`: the models, and published agents, the key may call. */
export const GET = withRouteHandler((request: NextRequest) =>
  answerGateway(async () => {
    const call = await authenticateGatewayCall(request)
    const parsed = await parseRequest(nexoraModelsContract, request, {}, gatewayParseOptions)
    if (!parsed.success) return parsed.response
    return Response.json(await listGatewayModels(call), { headers: call.headers })
  })
)
