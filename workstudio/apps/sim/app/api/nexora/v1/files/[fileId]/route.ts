import type { NextRequest } from 'next/server'
import {
  nexoraDeleteFileContract,
  nexoraRetrieveFileContract,
} from '@/lib/api/contracts/nexora-openai-batches'
import { parseRequest } from '@/lib/api/server'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { liveBatchApiDeps } from '@/lib/nexora/batches/live'
import { deleteFile, retrieveFile } from '@/lib/nexora/batches/openai'
import { authenticateGatewayCall } from '@/lib/nexora/developer-api/gateway'
import { answerGateway, gatewayParseOptions } from '@/app/api/nexora/v1/surface'

export const dynamic = 'force-dynamic'

type FileContext = { params: Promise<{ fileId: string }> }

/** `GET /v1/files/{file_id}`. */
export const GET = withRouteHandler((request: NextRequest, context: FileContext) =>
  answerGateway(async () => {
    const call = await authenticateGatewayCall(request)
    const parsed = await parseRequest(
      nexoraRetrieveFileContract,
      request,
      context,
      gatewayParseOptions
    )
    if (!parsed.success) return parsed.response
    return Response.json(await retrieveFile(call, parsed.data.params.fileId, liveBatchApiDeps), {
      headers: call.headers,
    })
  })
)

/** `DELETE /v1/files/{file_id}`. */
export const DELETE = withRouteHandler((request: NextRequest, context: FileContext) =>
  answerGateway(async () => {
    const call = await authenticateGatewayCall(request)
    const parsed = await parseRequest(
      nexoraDeleteFileContract,
      request,
      context,
      gatewayParseOptions
    )
    if (!parsed.success) return parsed.response
    return Response.json(await deleteFile(call, parsed.data.params.fileId, liveBatchApiDeps), {
      headers: call.headers,
    })
  })
)
