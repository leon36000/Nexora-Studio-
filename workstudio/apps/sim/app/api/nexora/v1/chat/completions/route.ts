import type { NextRequest } from 'next/server'
import { nexoraChatCompletionsContract } from '@/lib/api/contracts/nexora-openai'
import { parseRequest } from '@/lib/api/server'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { runAgentCompletion } from '@/lib/nexora/developer-api/agents'
import { admitSpending, authenticateGatewayCall } from '@/lib/nexora/developer-api/gateway'
import { relayChatCompletion } from '@/lib/nexora/developer-api/models'
import { agentRefusal, isAgentModel } from '@/lib/nexora/developer-api/policy'
import { answerGateway, gatewayParseOptions } from '@/app/api/nexora/v1/surface'

export const dynamic = 'force-dynamic'

/**
 * `POST /v1/chat/completions` (protocol exception: OpenAI wire format and SSE stream). A model of
 * the instance is relayed to Nexora API; `agent:<name or id>` runs a published agent of the key's
 * workspace. The key is checked before the body is read.
 */
export const POST = withRouteHandler((request: NextRequest) =>
  answerGateway(async () => {
    const call = await authenticateGatewayCall(request)
    const parsed = await parseRequest(
      nexoraChatCompletionsContract,
      request,
      {},
      gatewayParseOptions
    )
    if (!parsed.success) return parsed.response
    const { body } = parsed.data
    if (!isAgentModel(body.model)) return relayChatCompletion(call, body, request.signal)
    const refusal = agentRefusal(call.key, body.model)
    if (refusal) throw refusal
    await admitSpending(call.key)
    return runAgentCompletion(call, body, request)
  })
)
