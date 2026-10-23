import type { NextRequest } from 'next/server'
import { nexoraTranscriptionsContract } from '@/lib/api/contracts/nexora-openai'
import { parseRequest } from '@/lib/api/server'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { gatewayErrors } from '@/lib/nexora/developer-api/errors'
import { authenticateGatewayCall } from '@/lib/nexora/developer-api/gateway'
import { relayTranscription } from '@/lib/nexora/developer-api/models'
import { answerGateway, gatewayParseOptions } from '@/app/api/nexora/v1/surface'

export const dynamic = 'force-dynamic'

/** `POST /v1/audio/transcriptions` (multipart control: the form is relayed to Nexora API). */
export const POST = withRouteHandler((request: NextRequest) =>
  answerGateway(async () => {
    const call = await authenticateGatewayCall(request)
    const parsed = await parseRequest(
      nexoraTranscriptionsContract,
      request,
      {},
      gatewayParseOptions
    )
    if (!parsed.success) return parsed.response
    const form = await request.formData().catch(() => null)
    if (!form)
      throw gatewayErrors.invalidRequest(
        'Envoyez le fichier en multipart/form-data (champs « file » et « model »).'
      )
    return relayTranscription(call, form, request.signal)
  })
)
