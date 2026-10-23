import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { getAudioMetadata } from '@/lib/audio/extractor'
import { FFMPEG_BASE_ARGS, resolveExecutable, runExecutable } from '@/lib/media/ffmpeg-process'
import {
  type NexoraApiOptions,
  NexoraDocumentAiError,
  nexoraTranscribe,
  resolveUsageModel,
} from '@/lib/nexora/document-ai/client'

/** Ten minutes of speech: a few minutes of work for a CPU Whisper, well inside each request's limit. */
const CHUNK_SECONDS = 600
/** Longest recording one block transcribes (about an hour of work per hour of audio on a CPU). */
const MAX_AUDIO_SECONDS = 3 * 60 * 60
/** A recording whose length cannot be measured is sent whole only when it is this small. */
const UNMEASURED_MAX_BYTES = 25 * 1024 * 1024

export interface AudioChunk {
  start: number
  duration: number
}

/** Consecutive pieces of at most `chunkSeconds` covering a recording. */
export function planAudioChunks(
  durationSeconds: number,
  chunkSeconds = CHUNK_SECONDS
): AudioChunk[] {
  const chunks: AudioChunk[] = []
  for (let start = 0; start < durationSeconds; start += chunkSeconds) {
    chunks.push({ start, duration: Math.min(chunkSeconds, durationSeconds - start) })
  }
  return chunks.length > 0 ? chunks : [{ start: 0, duration: durationSeconds }]
}

export interface AudioInput {
  audio: Buffer
  mimeType: string
  fileName: string
}

export interface TranscriptionSteps {
  /** Length in seconds, `null` when it cannot be measured. */
  measure: (input: AudioInput) => Promise<number | null>
  /** One piece of the recording, as 16 kHz mono MP3. */
  cut: (input: AudioInput, chunk: AudioChunk) => Promise<Buffer>
  transcribe: (piece: { audio: Buffer; mimeType: string; fileName: string }) => Promise<string>
  /** The text of a piece an earlier, interrupted run already transcribed, `null` otherwise. */
  recall?: (position: number) => Promise<string | null>
  /** Keeps a piece's text before the next piece starts, so a later run resumes after it. */
  remember?: (position: number, text: string) => Promise<void>
  /** Runs before each piece still to transcribe; throws to stop the run there (time is up). */
  beforePiece?: () => void
}

/**
 * Long audio is cut into ten-minute pieces transcribed one after the other, so no request runs
 * into a timeout; a recording longer than three hours, or one that cannot be measured and is
 * too large to send whole, is refused before any work starts.
 */
export async function transcribeAudio(
  input: AudioInput,
  steps: TranscriptionSteps
): Promise<{ transcript: string; duration?: number }> {
  const duration = await steps.measure(input)
  if (duration === null) {
    if (input.audio.length > UNMEASURED_MAX_BYTES) {
      throw new NexoraDocumentAiError(
        'too-long',
        'The length of this recording cannot be measured and it is too large to send whole: convert it to MP3 or WAV'
      )
    }
    return { transcript: await steps.transcribe(input) }
  }
  if (duration > MAX_AUDIO_SECONDS) {
    throw new NexoraDocumentAiError(
      'too-long',
      `This recording lasts ${Math.round(duration / 60)} min; a block transcribes at most ${MAX_AUDIO_SECONDS / 3600} h. Split it first`
    )
  }
  const chunks = planAudioChunks(duration)
  const texts: string[] = []
  for (const [position, chunk] of chunks.entries()) {
    const kept = await steps.recall?.(position)
    if (kept !== undefined && kept !== null) {
      texts.push(kept)
      continue
    }
    steps.beforePiece?.()
    const text =
      chunks.length === 1
        ? await steps.transcribe(input)
        : await steps.transcribe({
            audio: await steps.cut(input, chunk),
            mimeType: 'audio/mpeg',
            fileName: `part-${position + 1}.mp3`,
          })
    await steps.remember?.(position, text)
    texts.push(text)
  }
  return { transcript: texts.filter(Boolean).join(' '), duration }
}

async function measureWithFfprobe(input: AudioInput, signal?: AbortSignal): Promise<number | null> {
  try {
    const { duration } = await getAudioMetadata(input.audio, input.mimeType, signal)
    return duration > 0 ? duration : null
  } catch {
    signal?.throwIfAborted()
    return null
  }
}

async function cutWithFfmpeg(
  input: AudioInput,
  chunk: AudioChunk,
  signal?: AbortSignal
): Promise<Buffer> {
  const ffmpeg = resolveExecutable('ffmpeg')
  if (!ffmpeg) {
    throw new NexoraDocumentAiError(
      'too-long',
      'This recording is longer than ten minutes and FFmpeg, needed to cut it, is missing'
    )
  }
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'nexora-audio-'))
  try {
    const source = path.join(dir, 'input')
    const piece = path.join(dir, 'piece.mp3')
    await fs.writeFile(source, input.audio, { signal })
    await runExecutable(
      ffmpeg,
      [
        ...FFMPEG_BASE_ARGS,
        '-ss',
        String(chunk.start),
        '-t',
        String(chunk.duration),
        '-i',
        source,
        '-vn',
        '-ac',
        '1',
        '-ar',
        '16000',
        '-f',
        'mp3',
        piece,
      ],
      { signal, timeoutMs: 5 * 60 * 1000, maxOutputBytes: 4 * 1024 * 1024 }
    )
    return await fs.readFile(piece, { signal })
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined)
  }
}

export interface TranscribeWithNexoraInput extends AudioInput {
  model?: string | null
  language?: string
  prompt?: string
}

/**
 * The Speech-to-Text block with the Nexora provider. A knowledge base passes `resume` to keep
 * each finished piece and stop between pieces, so a long recording survives a restart.
 */
export async function transcribeWithNexora(
  input: TranscribeWithNexoraInput,
  options: NexoraApiOptions = {},
  resume: Pick<TranscriptionSteps, 'recall' | 'remember' | 'beforePiece'> = {}
): Promise<{ transcript: string; duration?: number; model: string }> {
  const model = await resolveUsageModel('transcription', input.model, options)
  const result = await transcribeAudio(input, {
    ...resume,
    measure: (audio) => measureWithFfprobe(audio, options.signal),
    cut: (audio, chunk) => cutWithFfmpeg(audio, chunk, options.signal),
    transcribe: (piece) =>
      nexoraTranscribe(
        { ...piece, model, language: input.language, prompt: input.prompt },
        options
      ),
  })
  return { ...result, model }
}
