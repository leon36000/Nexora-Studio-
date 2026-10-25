import type { NextRequest } from 'next/server'
import { nexoraFileContentContract } from '@/lib/api/contracts/nexora-openai-batches'
import { parseRequest } from '@/lib/api/server'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { liveBatchApiDeps } from '@/lib/nexora/batches/live'
import { readFileContent } from '@/lib/nexora/batches/openai'
import { authenticateGatewayCall } from '@/lib/nexora/developer-api/gateway'
import { answerGateway, gatewayParseOptions } from '@/app/api/nexora/v1/surface'

export const dynamic = 'force-dynamic'

/** `GET /v1/files/{file_id}/content` (protocol exception: JSONL streamed, not JSON). */
export const GET = withRouteHandler(
  (request: NextRequest, context: { params: Promise<{ fileId: string }> }) =>
    answerGateway(async () => {
      const call = await authenticateGatewayCall(request)
      const parsed = await parseRequest(
        nexoraFileContentContract,
        request,
        context,
        gatewayParseOptions
      )
      if (!parsed.success) return parsed.response
      const content = await readFileContent(call, parsed.data.params.fileId, liveBatchApiDeps)
      return new Response(content.body, {
        status: 200,
        headers: { 'Content-Type': content.contentType, ...call.headers },
      })
    })
)
