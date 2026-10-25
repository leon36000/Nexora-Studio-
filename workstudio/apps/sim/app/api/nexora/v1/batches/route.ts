import type { NextRequest } from 'next/server'
import {
  nexoraCreateBatchContract,
  nexoraListBatchesContract,
} from '@/lib/api/contracts/nexora-openai-batches'
import { parseRequest } from '@/lib/api/server'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { liveBatchApiDeps } from '@/lib/nexora/batches/live'
import { createBatch, listBatches } from '@/lib/nexora/batches/openai'
import { authenticateGatewayCall } from '@/lib/nexora/developer-api/gateway'
import { answerGateway, gatewayParseOptions } from '@/app/api/nexora/v1/surface'

export const dynamic = 'force-dynamic'

/** `POST /v1/batches`: creates a batch from an uploaded JSONL file and starts it in the background. */
export const POST = withRouteHandler((request: NextRequest) =>
  answerGateway(async () => {
    const call = await authenticateGatewayCall(request)
    const parsed = await parseRequest(nexoraCreateBatchContract, request, {}, gatewayParseOptions)
    if (!parsed.success) return parsed.response
    return Response.json(await createBatch(call, parsed.data.body, liveBatchApiDeps), {
      headers: call.headers,
    })
  })
)

/** `GET /v1/batches`: the batches of the key's workspace, newest first. */
export const GET = withRouteHandler((request: NextRequest) =>
  answerGateway(async () => {
    const call = await authenticateGatewayCall(request)
    const parsed = await parseRequest(nexoraListBatchesContract, request, {}, gatewayParseOptions)
    if (!parsed.success) return parsed.response
    return Response.json(await listBatches(call, parsed.data.query, liveBatchApiDeps), {
      headers: call.headers,
    })
  })
)
