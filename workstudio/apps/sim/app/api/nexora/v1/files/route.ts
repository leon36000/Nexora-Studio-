import type { NextRequest } from 'next/server'
import {
  nexoraCreateFileContract,
  nexoraListFilesContract,
} from '@/lib/api/contracts/nexora-openai-batches'
import { parseRequest } from '@/lib/api/server'
import {
  isPayloadSizeLimitError,
  MAX_MULTIPART_OVERHEAD_BYTES,
  readFormDataWithLimit,
} from '@/lib/core/utils/stream-limits'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { liveBatchApiDeps } from '@/lib/nexora/batches/live'
import { createFile, listFiles } from '@/lib/nexora/batches/openai'
import { MAX_BATCH_FILE_BYTES } from '@/lib/nexora/batches/types'
import { gatewayErrors } from '@/lib/nexora/developer-api/errors'
import { authenticateGatewayCall } from '@/lib/nexora/developer-api/gateway'
import { answerGateway, gatewayParseOptions } from '@/app/api/nexora/v1/surface'

export const dynamic = 'force-dynamic'

const MAX_FILE_MEGABYTES = MAX_BATCH_FILE_BYTES / (1024 * 1024)

/** `POST /v1/files` (multipart control: the JSONL is read here, bounded by the batch file limit). */
export const POST = withRouteHandler((request: NextRequest) =>
  answerGateway(async () => {
    const call = await authenticateGatewayCall(request)
    const parsed = await parseRequest(nexoraCreateFileContract, request, {}, gatewayParseOptions)
    if (!parsed.success) return parsed.response
    const form = await readFormDataWithLimit(request, {
      maxBytes: MAX_BATCH_FILE_BYTES + MAX_MULTIPART_OVERHEAD_BYTES,
      label: 'Batch file upload',
    }).catch((error: unknown) => {
      if (isPayloadSizeLimitError(error)) throw gatewayErrors.batchFileTooLarge(MAX_FILE_MEGABYTES)
      return null
    })
    const file = form?.get('file')
    const purpose = form?.get('purpose')
    if (!form || !(file instanceof File) || typeof purpose !== 'string') {
      throw gatewayErrors.invalidRequest(
        'Envoyez le fichier en multipart/form-data (champs « file » et « purpose »).'
      )
    }
    if (file.size > MAX_BATCH_FILE_BYTES) throw gatewayErrors.batchFileTooLarge(MAX_FILE_MEGABYTES)
    const created = await createFile(
      call,
      { filename: file.name, text: await file.text(), purpose },
      liveBatchApiDeps
    )
    return Response.json(created, { headers: call.headers })
  })
)

/** `GET /v1/files`: the files of the key's workspace, newest first. */
export const GET = withRouteHandler((request: NextRequest) =>
  answerGateway(async () => {
    const call = await authenticateGatewayCall(request)
    const parsed = await parseRequest(nexoraListFilesContract, request, {}, gatewayParseOptions)
    if (!parsed.success) return parsed.response
    return Response.json(await listFiles(call, parsed.data.query, liveBatchApiDeps), {
      headers: call.headers,
    })
  })
)
