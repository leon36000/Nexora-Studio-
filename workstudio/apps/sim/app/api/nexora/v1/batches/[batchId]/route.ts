import type { NextRequest } from 'next/server'
import { nexoraRetrieveBatchContract } from '@/lib/api/contracts/nexora-openai-batches'
import { parseRequest } from '@/lib/api/server'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { liveBatchApiDeps } from '@/lib/nexora/batches/live'
import { retrieveBatch } from '@/lib/nexora/batches/openai'
import { authenticateGatewayCall } from '@/lib/nexora/developer-api/gateway'
import { answerGateway, gatewayParseOptions } from '@/app/api/nexora/v1/surface'

export const dynamic = 'force-dynamic'

/** `GET /v1/batches/{batch_id}`. */
export const GET = withRouteHandler(
  (request: NextRequest, context: { params: Promise<{ batchId: string }> }) =>
    answerGateway(async () => {
      const call = await authenticateGatewayCall(request)
      const parsed = await parseRequest(
        nexoraRetrieveBatchContract,
        request,
        context,
        gatewayParseOptions
      )
      if (!parsed.success) return parsed.response
      return Response.json(
        await retrieveBatch(call, parsed.data.params.batchId, liveBatchApiDeps),
        { headers: call.headers }
      )
    })
)
