import { NexoraDocumentAiError } from '@/lib/nexora/document-ai/client'
import type { AudioInput } from '@/lib/nexora/document-ai/transcription'
import type { NexoraDiarizedInput, SpeakerSegment } from '@/lib/nexora/voice/client'

/**
 * Longest meeting told apart in one go. The speakers of two separate requests cannot be matched
 * (each answer numbers its own voices), so a meeting is never cut into pieces: past this length it
 * is refused, and the person splits it first.
 */
export const MEETING_MAX_SECONDS = 60 * 60
/** A recording whose length cannot be measured is sent only when it is this small. */
const UNMEASURED_MAX_BYTES = 25 * 1024 * 1024

export interface MeetingInput extends AudioInput {
  language?: string
  prompt?: string
  numSpeakers?: number
}

export interface MeetingSteps {
  /** Length in seconds, `null` when it cannot be measured. */
  measure: (input: AudioInput) => Promise<number | null>
  /** The recording as a small 16 kHz mono MP3 when it can be re-encoded, else unchanged. */
  prepare: (input: MeetingInput) => Promise<MeetingInput>
  diarized: (
    input: Omit<NexoraDiarizedInput, 'model'>
  ) => Promise<{ text: string; segments: SpeakerSegment[] }>
  /** The plain transcript, when the speakers cannot be told. */
  plain: (input: MeetingInput) => Promise<string>
}

export interface MeetingTranscript {
  /** The whole text, without speakers. */
  transcript: string
  segments: SpeakerSegment[]
  /** How many voices were told apart (0 when the instance cannot tell). */
  speakers: number
  /** « Intervenant 1 : … », one line per turn of speech. */
  transcriptBySpeaker: string
  duration?: number
  warning?: string
}

/** `speaker_2` ⇒ « Intervenant 2 ». */
export function speakerLabel(speaker: string): string {
  const numbered = /^speaker_(\d+)$/.exec(speaker)
  return numbered ? `Intervenant ${numbered[1]}` : speaker
}

export function formatSpeakerTranscript(segments: readonly SpeakerSegment[]): string {
  const lines: { speaker: string; text: string }[] = []
  for (const segment of segments) {
    const last = lines.at(-1)
    if (last && last.speaker === segment.speaker) last.text += ` ${segment.text}`
    else lines.push({ speaker: segment.speaker, text: segment.text })
  }
  return lines.map((line) => `${speakerLabel(line.speaker)} : ${line.text}`).join('\n')
}

const NO_SPEAKERS_WARNING =
  'Les intervenants ne sont pas disponibles sur cette instance : le texte est donné sans eux (activez la voix locale).'

/**
 * A meeting told by speaker: the whole recording goes in one request so that « Intervenant 1 » is
 * the same voice from start to end. An instance without the diarization service still gets the
 * text, with a warning; any other failure is the caller's to see.
 */
export async function transcribeMeeting(
  input: MeetingInput,
  steps: MeetingSteps
): Promise<MeetingTranscript> {
  const duration = await steps.measure(input)
  if (duration === null && input.audio.length > UNMEASURED_MAX_BYTES) {
    throw new NexoraDocumentAiError(
      'too-long',
      'The length of this recording cannot be measured and it is too large to send whole: convert it to MP3 or WAV'
    )
  }
  if (duration !== null && duration > MEETING_MAX_SECONDS) {
    throw new NexoraDocumentAiError(
      'too-long',
      `This meeting lasts ${Math.round(duration / 60)} min; speakers are told apart for ${MEETING_MAX_SECONDS / 60} min at most. Split the recording first`
    )
  }
  const prepared = await steps.prepare(input)
  try {
    const { text, segments } = await steps.diarized({
      audio: prepared.audio,
      mimeType: prepared.mimeType,
      fileName: prepared.fileName,
      language: input.language,
      prompt: input.prompt,
      numSpeakers: input.numSpeakers,
    })
    return {
      transcript: text,
      segments,
      speakers: new Set(segments.map((segment) => segment.speaker)).size,
      transcriptBySpeaker: formatSpeakerTranscript(segments),
      ...(duration !== null ? { duration } : {}),
    }
  } catch (error) {
    if (!(error instanceof NexoraDocumentAiError) || error.code !== 'diarization-unavailable') {
      throw error
    }
    const transcript = await steps.plain(prepared)
    return {
      transcript,
      segments: [],
      speakers: 0,
      transcriptBySpeaker: transcript,
      ...(duration !== null ? { duration } : {}),
      warning: NO_SPEAKERS_WARNING,
    }
  }
}
