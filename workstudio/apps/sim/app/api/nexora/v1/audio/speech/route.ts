import type { NextRequest } from 'next/server'
import { nexoraSpeechContract } from '@/lib/api/contracts/nexora-openai'
import { parseRequest } from '@/lib/api/server'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { authenticateGatewayCall } from '@/lib/nexora/developer-api/gateway'
import { relaySpeech } from '@/lib/nexora/developer-api/models'
import { answerGateway, gatewayParseOptions } from '@/app/api/nexora/v1/surface'

export const dynamic = 'force-dynamic'

/** `POST /v1/audio/speech`, relayed to Nexora API (OpenAI wire format, audio in the answer). */
export const POST = withRouteHandler((request: NextRequest) =>
  answerGateway(async () => {
    const call = await authenticateGatewayCall(request)
    const parsed = await parseRequest(nexoraSpeechContract, request, {}, gatewayParseOptions)
    if (!parsed.success) return parsed.response
    return relaySpeech(call, parsed.data.body, request.signal)
  })
)
