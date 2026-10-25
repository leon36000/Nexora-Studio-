import { toRecord } from '@sim/utils/object'

/** What went wrong with a voice request, in the terms the page words in French. */
export type VoiceErrorCode = 'no-model' | 'unavailable' | 'too-long' | 'empty' | 'failed'

const KNOWN_CODES: ReadonlySet<string> = new Set(['no-model', 'unavailable', 'too-long', 'empty'])

export class VoiceError extends Error {
  constructor(readonly code: VoiceErrorCode) {
    super(`Voice request failed: ${code}`)
    this.name = 'VoiceError'
  }
}

/** An answer's `error` when it is one of ours, a server fault as « unavailable », else « failed ». */
async function failureOf(response: Response): Promise<VoiceError> {
  const body = toRecord(await response.json().catch(() => ({})))
  const code = typeof body.error === 'string' ? body.error : ''
  if (KNOWN_CODES.has(code)) return new VoiceError(code as VoiceErrorCode)
  return new VoiceError(response.status >= 500 ? 'unavailable' : 'failed')
}

interface VoiceRequest {
  workspaceId: string
  signal: AbortSignal
  fetchFn?: typeof fetch
}

/** A recording is too small to hold speech below this size. */
const MIN_RECORDING_BYTES = 1024

/** Sends a dictation to the instance's Transcription model and returns what was said. */
export async function dictateRecording({
  workspaceId,
  recording,
  language,
  signal,
  fetchFn = fetch,
}: VoiceRequest & { recording: Blob; language: string }): Promise<string> {
  if (recording.size < MIN_RECORDING_BYTES) throw new VoiceError('empty')
  const form = new FormData()
  form.set('workspaceId', workspaceId)
  form.set('language', language)
  form.set('file', new File([recording], 'dictee.webm', { type: recording.type || 'audio/webm' }))
  let response: Response
  try {
    // boundary-raw-fetch: multipart upload of a recording
    response = await fetchFn('/api/nexora/assistant/voice/dictate', {
      method: 'POST',
      body: form,
      signal,
    })
  } catch (error) {
    signal.throwIfAborted()
    throw new VoiceError('unavailable')
  }
  if (!response.ok) throw await failureOf(response)
  const text = String(toRecord(await response.json().catch(() => ({}))).text ?? '').trim()
  if (!text) throw new VoiceError('empty')
  return text
}

/** The audio of one piece of an answer, said by the instance's Speech synthesis model. */
export async function speakPiece({
  workspaceId,
  text,
  signal,
  fetchFn = fetch,
}: VoiceRequest & { text: string }): Promise<Blob> {
  let response: Response
  try {
    // boundary-raw-fetch: binary audio response
    response = await fetchFn('/api/nexora/assistant/voice/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, text }),
      signal,
    })
  } catch (error) {
    signal.throwIfAborted()
    throw new VoiceError('unavailable')
  }
  if (!response.ok) throw await failureOf(response)
  return response.blob()
}
