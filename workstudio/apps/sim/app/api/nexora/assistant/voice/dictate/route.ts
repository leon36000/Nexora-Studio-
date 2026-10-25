import { type NextRequest, NextResponse } from 'next/server'
import { assistantDictateContract } from '@/lib/api/contracts/nexora-voice'
import { parseRequest } from '@/lib/api/server'
import {
  isPayloadSizeLimitError,
  MAX_MULTIPART_OVERHEAD_BYTES,
  readFormDataWithLimit,
} from '@/lib/core/utils/stream-limits'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'
import { transcribeWithNexora } from '@/lib/nexora/document-ai/transcription'
import { authorizeVoiceCall, voiceFailure } from '@/app/api/nexora/assistant/voice/surface'

export const dynamic = 'force-dynamic'

/** A dictation is a few minutes at most; the limit keeps a long recording from tying up Whisper. */
const MAX_DICTATION_MEGABYTES = 25
const MAX_DICTATION_BYTES = MAX_DICTATION_MEGABYTES * 1024 * 1024
const LANGUAGES: ReadonlySet<string> = new Set(['fr', 'en', 'auto'])

/**
 * Multipart route: the Assistant's dictation. A recording made in the browser is transcribed by the
 * instance's own Transcription model (with the company's lexicon) and its text goes back to the
 * message box. Members of the workspace only; the recording is not kept.
 */
export const POST = withRouteHandler(async (request: NextRequest) => {
  const parsed = await parseRequest(assistantDictateContract, request, {})
  if (!parsed.success) return parsed.response
  let form: FormData
  try {
    form = await readFormDataWithLimit(request, {
      maxBytes: MAX_DICTATION_BYTES + MAX_MULTIPART_OVERHEAD_BYTES,
      label: 'Dictation upload',
    })
  } catch (error) {
    if (isPayloadSizeLimitError(error)) {
      return NextResponse.json(
        { error: 'too-long', message: 'Recording too large' },
        { status: 413 }
      )
    }
    return NextResponse.json({ error: 'Invalid multipart form' }, { status: 400 })
  }
  const workspaceId = form.get('workspaceId')
  const access = await authorizeVoiceCall(typeof workspaceId === 'string' ? workspaceId : null)
  if ('refusal' in access) return access.refusal

  const file = form.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'empty', message: 'The recording is empty' }, { status: 400 })
  }
  const asked = form.get('language')
  const language = typeof asked === 'string' && LANGUAGES.has(asked) ? asked : 'fr'
  try {
    const { transcript } = await transcribeWithNexora(
      {
        audio: Buffer.from(await file.arrayBuffer()),
        mimeType: file.type || 'audio/webm',
        fileName: file.name || 'dictee.webm',
        language,
      },
      { signal: request.signal }
    )
    return NextResponse.json({ text: transcript.trim() })
  } catch (error) {
    return voiceFailure(error)
  }
})
