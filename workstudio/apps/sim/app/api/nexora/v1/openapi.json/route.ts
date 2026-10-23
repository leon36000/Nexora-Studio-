import type { NextRequest } from 'next/server'
import { nexoraOpenApiContract } from '@/lib/api/contracts/nexora-openai'
import { parseRequest } from '@/lib/api/server'
import { getBaseUrl } from '@/lib/core/utils/urls'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { buildDeveloperOpenApi } from '@/lib/nexora/developer-api/openapi'

/** `GET /v1/openapi.json`: public description of the developer API, with this instance's address. */
export const GET = withRouteHandler(async (request: NextRequest) => {
  const parsed = await parseRequest(nexoraOpenApiContract, request, {})
  if (!parsed.success) return parsed.response
  return Response.json(buildDeveloperOpenApi(getBaseUrl()))
})
