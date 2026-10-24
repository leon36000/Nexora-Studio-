import type { NextRequest } from 'next/server'
import { nexoraTranscriptionsContract } from '@/lib/api/contracts/nexora-openai'
import { parseRequest } from '@/lib/api/server'
import {
  isPayloadSizeLimitError,
  MAX_MULTIPART_OVERHEAD_BYTES,
  readFormDataWithLimit,
} from '@/lib/core/utils/stream-limits'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { gatewayErrors } from '@/lib/nexora/developer-api/errors'
import { authenticateGatewayCall } from '@/lib/nexora/developer-api/gateway'
import { relayTranscription } from '@/lib/nexora/developer-api/models'
import { answerGateway, gatewayParseOptions } from '@/app/api/nexora/v1/surface'

export const dynamic = 'force-dynamic'

/** OpenAI's limit for one audio file; the proxy leaves `/v1` unbuffered, so this route bounds it. */
const MAX_AUDIO_MEGABYTES = 25
const MAX_AUDIO_BYTES = MAX_AUDIO_MEGABYTES * 1024 * 1024

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
    const form = await readFormDataWithLimit(request, {
      maxBytes: MAX_AUDIO_BYTES + MAX_MULTIPART_OVERHEAD_BYTES,
      label: 'Audio upload',
    }).catch((error: unknown) => {
      if (isPayloadSizeLimitError(error)) throw gatewayErrors.fileTooLarge(MAX_AUDIO_MEGABYTES)
      return null
    })
    if (!form)
      throw gatewayErrors.invalidRequest(
        'Envoyez le fichier en multipart/form-data (champs « file » et « model »).'
      )
    return relayTranscription(call, form, request.signal)
  })
)
