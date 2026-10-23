import type { NextRequest } from 'next/server'
import { nexoraEmbeddingsContract } from '@/lib/api/contracts/nexora-openai'
import { parseRequest } from '@/lib/api/server'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { authenticateGatewayCall } from '@/lib/nexora/developer-api/gateway'
import { relayEmbeddings } from '@/lib/nexora/developer-api/models'
import { answerGateway, gatewayParseOptions } from '@/app/api/nexora/v1/surface'

export const dynamic = 'force-dynamic'

/** `POST /v1/embeddings`, relayed to Nexora API (OpenAI wire format). */
export const POST = withRouteHandler((request: NextRequest) =>
  answerGateway(async () => {
    const call = await authenticateGatewayCall(request)
    const parsed = await parseRequest(nexoraEmbeddingsContract, request, {}, gatewayParseOptions)
    if (!parsed.success) return parsed.response
    return relayEmbeddings(call, parsed.data.body, request.signal)
  })
)
