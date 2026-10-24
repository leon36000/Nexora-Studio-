import type { NextRequest } from 'next/server'
import {
  nexoraUnknownGetContract,
  nexoraUnknownPostContract,
} from '@/lib/api/contracts/nexora-openai'
import { parseRequest } from '@/lib/api/server'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { gatewayErrors } from '@/lib/nexora/developer-api/errors'
import { answerGateway, gatewayParseOptions } from '@/app/api/nexora/v1/surface'

function unknownPath(path: string[] | undefined): string {
  return path?.length ? `/v1/${path.join('/')}` : '/v1'
}

type UnknownEndpointContext = { params: Promise<{ path?: string[] }> }

/** `/v1` itself or any other `/v1` path: a French 404 in OpenAI's shape, naming the endpoints. */
export const GET = withRouteHandler((request: NextRequest, context: UnknownEndpointContext) =>
  answerGateway(async () => {
    const parsed = await parseRequest(
      nexoraUnknownGetContract,
      request,
      context,
      gatewayParseOptions
    )
    if (!parsed.success) return parsed.response
    throw gatewayErrors.notFound(unknownPath(parsed.data.params.path))
  })
)

export const POST = withRouteHandler((request: NextRequest, context: UnknownEndpointContext) =>
  answerGateway(async () => {
    const parsed = await parseRequest(
      nexoraUnknownPostContract,
      request,
      context,
      gatewayParseOptions
    )
    if (!parsed.success) return parsed.response
    throw gatewayErrors.notFound(unknownPath(parsed.data.params.path))
  })
)
