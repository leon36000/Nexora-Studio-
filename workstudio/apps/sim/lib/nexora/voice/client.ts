import { toRecord } from '@sim/utils/object'
import {
  assertAnswered,
  callNexoraApi,
  callNexoraApiForBytes,
  type NexoraApiOptions,
  NexoraDocumentAiError,
  type NexoraTranscribeInput,
} from '@/lib/nexora/document-ai/client'

/** What Nexora API accepts in one `/audio/speech` request. */
export const MAX_SPEECH_CHARACTERS = 4096

export interface NexoraSpeakInput {
  text: string
  /** A Speech synthesis model of Réglages › Modèles. */
  model: string
  voice?: string
  format?: 'wav' | 'mp3'
  speed?: number
}

/** One `/audio/speech` request: a text said by a local voice, as audio bytes. */
export async function nexoraSpeak(
  input: NexoraSpeakInput,
  options: NexoraApiOptions = {}
): Promise<{ audio: Buffer; mimeType: string }> {
  const text = input.text.trim()
  if (!text) throw new NexoraDocumentAiError('refused', 'There is no text to read aloud')
  if (text.length > MAX_SPEECH_CHARACTERS) {
    throw new NexoraDocumentAiError(
      'refused',
      `The text is too long to read in one go (${text.length} characters, ${MAX_SPEECH_CHARACTERS} at most)`
    )
  }
  const { status, bytes, contentType, data } = await callNexoraApiForBytes(
    '/audio/speech',
    JSON.stringify({
      model: input.model,
      input: text,
      voice: input.voice || 'default',
      response_format: input.format ?? 'wav',
      ...(input.speed ? { speed: input.speed } : {}),
    }),
    options
  )
  assertAnswered(status, data, 'Speech synthesis')
  if (!contentType.startsWith('audio/') || bytes.length === 0) {
    throw new NexoraDocumentAiError('unavailable', 'Speech synthesis did not return any audio')
  }
  return { audio: bytes, mimeType: contentType }
}

/** A stretch said by one speaker (`speaker_1`, `speaker_2`… in order of first appearance). */
export interface SpeakerSegment {
  speaker: string
  start: number
  end: number
  text: string
}

function readSegments(value: unknown): SpeakerSegment[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const segment = toRecord(item)
    const { text, start, end, speaker } = segment
    if (typeof text !== 'string' || !text.trim()) return []
    if (typeof start !== 'number' || typeof end !== 'number') return []
    return [
      {
        speaker: typeof speaker === 'string' && speaker ? speaker : 'speaker_1',
        start,
        end,
        text: text.trim(),
      },
    ]
  })
}

export interface NexoraDiarizedInput extends NexoraTranscribeInput {
  /** The number of speakers, when known; otherwise the diarization service counts them. */
  numSpeakers?: number
}

/** One `/audio/transcriptions` request asking who said what (`diarized_json`). */
export async function nexoraTranscribeDiarized(
  input: NexoraDiarizedInput,
  options: NexoraApiOptions = {}
): Promise<{ text: string; segments: SpeakerSegment[] }> {
  const form = new FormData()
  form.append(
    'file',
    new Blob([new Uint8Array(input.audio)], { type: input.mimeType || 'audio/mpeg' }),
    input.fileName || 'audio.mp3'
  )
  form.append('model', input.model)
  if (input.language && input.language !== 'auto') form.append('language', input.language)
  if (input.prompt) form.append('prompt', input.prompt)
  if (input.numSpeakers) form.append('num_speakers', String(input.numSpeakers))
  form.append('response_format', 'diarized_json')
  const { status, data } = await callNexoraApi('/audio/transcriptions', { body: form }, options)
  if (status === 501) {
    throw new NexoraDocumentAiError(
      'diarization-unavailable',
      'Speaker identification is not available on this instance (the voice service is not installed)'
    )
  }
  assertAnswered(status, data, 'Transcription')
  return {
    text: typeof data.text === 'string' ? data.text.trim() : '',
    segments: readSegments(data.segments),
  }
}
