import { createLogger } from '@sim/logger'
import { env } from '@/lib/core/config/env'
import { ProviderCapacityDeferredError } from '@/lib/core/rate-limiter/provider-capacity-error'
import {
  createOcrCheckpoints,
  type OcrCheckpointContext,
} from '@/lib/knowledge/documents/ocr-checkpoints'
import {
  OCR_IMAGE_MIME_TYPES,
  type OcrRequestPolicy,
} from '@/lib/knowledge/documents/ocr-request-policy'
import {
  OcrRequestRejectedError,
  PermanentDocumentProcessingError,
} from '@/lib/knowledge/documents/processing-error'
import type { ProcessingProgressStore } from '@/lib/knowledge/documents/processing-progress'
import {
  assertAnswered,
  NexoraDocumentAiError,
  resolveUsageModel,
} from '@/lib/nexora/document-ai/client'
import { readsImagesOnly } from '@/lib/nexora/document-ai/ocr'
import { countPdfPages, renderPdfPages } from '@/lib/nexora/document-ai/pdf'
import { transcribeWithNexora } from '@/lib/nexora/document-ai/transcription'
import { imageDataUri, requestOcr, toOcrResult } from '@/lib/nexora/document-ai/vision'
import {
  NO_OCR_MODEL_MESSAGE,
  NO_TRANSCRIPTION_MODEL_MESSAGE,
  PIECE_TOO_LONG_MESSAGE,
} from '@/lib/nexora/knowledge-errors'
import { getFileExtension, getMimeTypeFromExtension } from '@/lib/uploads/utils/file'
import { normalizeMimeType } from '@/lib/uploads/utils/mime'
import { sniffImageContentType } from '@/lib/uploads/utils/validation'

const logger = createLogger('NexoraKnowledgeExtraction')

/**
 * Pages read per request. A vision model reads a page from a few seconds on a GPU to a minute or
 * more on a CPU (a dense page several): one page per request keeps each request well inside a
 * processing slice, and each page is saved before the next, so a 300-page scan read over many
 * slices (or across a restart) never reads a saved page again.
 */
const NEXORA_OCR_PAGES_PER_BATCH = 1
const NEXORA_OCR_PAGE_BUDGET_MS = 120_000

/** Splits scans into single pages, one request at a time; Nexora API serves one model per call. */
export const NEXORA_OCR_REQUEST_POLICY = {
  maxBytes: 50_000_000,
  maxPages: NEXORA_OCR_PAGES_PER_BATCH,
  maxChunks: 5_000,
  concurrency: 1,
} as const satisfies OcrRequestPolicy

/** Time a batch may take: a slice starts another batch only when this much is left. */
export const NEXORA_OCR_BATCH_BUDGET_MS = NEXORA_OCR_PAGES_PER_BATCH * NEXORA_OCR_PAGE_BUDGET_MS

/**
 * Length of a piece of a recording indexed in a knowledge base: a CPU Whisper transcribes three
 * minutes of speech in one to two minutes, well inside a slice. Blocks keep longer pieces.
 */
const KNOWLEDGE_PIECE_SECONDS = 180
/** Time a piece may take: a slice starts another piece only when this much is left. */
const TRANSCRIPTION_PIECE_BUDGET_MS = 150_000
/** Time kept after the last piece for chunking, embedding and the index write. */
const INDEXING_RESERVE_MS = 75_000
/** Time kept before the slice ends to note a page or piece that outran it and hand over. */
const OVERRUN_RESERVE_MS = 30_000
/** A page or piece stopped by this many slices in a row will never fit in one. */
const MAX_SLICE_OVERRUNS = 2
/** Pieces are addressed like OCR page ranges; this policy only scopes the checkpoint identity. */
const TRANSCRIPTION_CHECKPOINT_POLICY = {
  maxBytes: 100 * 1024 * 1024,
  maxPages: 1,
  maxChunks: 1_000,
  concurrency: 1,
} as const satisfies OcrRequestPolicy
const MAX_TRANSCRIPT_BYTES = 20 * 1024 * 1024

const AUDIO_EXTENSIONS: ReadonlySet<string> = new Set(['mp3', 'wav', 'm4a', 'ogg', 'webm'])
const AUDIO_MIME_TYPES: ReadonlySet<string> = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  'audio/ogg',
  'application/ogg',
  'audio/webm',
])
/** Declared types that name no format: browsers send them for plenty of real files. */
const GENERIC_MIME_TYPES: ReadonlySet<string> = new Set([
  '',
  'application/octet-stream',
  'binary/octet-stream',
  'application/binary',
  'application/unknown',
])

/** Whether Nexora API reads this deployment's documents (the Nexora edition sets `VLLM_BASE_URL`). */
export function isNexoraDocumentAiConfigured(): boolean {
  return Boolean(env.VLLM_BASE_URL?.trim())
}

/** A recording a knowledge base transcribes: by its media type, or its extension when untyped. */
export function isKnowledgeAudio(filename: string, mimeType: string): boolean {
  const type = normalizeMimeType(mimeType)
  if (AUDIO_MIME_TYPES.has(type)) return true
  return (
    (!type || type === 'application/octet-stream' || type === 'video/webm') &&
    AUDIO_EXTENSIONS.has(getFileExtension(filename))
  )
}

/** Whether a declared type names no format, so the name or the content must tell. */
export function isGenericMimeType(mimeType: string): boolean {
  return GENERIC_MIME_TYPES.has(normalizeMimeType(mimeType))
}

/** A scan or an image, by its name: the type OCR reads it as, `null` for anything else. */
export function scanTypeFromName(filename: string): string | null {
  const type = getMimeTypeFromExtension(getFileExtension(filename))
  return type === 'application/pdf' || OCR_IMAGE_MIME_TYPES.has(type) ? type : null
}

/** A scan or an image, by its first bytes (PDF, PNG, JPEG, GIF, WebP), `null` for anything else. */
export function scanTypeFromContent(content: Buffer): string | null {
  if (content.subarray(0, 1024).includes('%PDF-')) return 'application/pdf'
  return sniffImageContentType(content)
}

/**
 * Maps a Nexora API failure onto the knowledge pipeline's vocabulary: an unreachable service
 * becomes a durable wait (the document resumes later instead of burning its retries), a refusal
 * stops automatic retries, a model gone from Nexora API fails at once with the setup reason, an
 * over-long recording is a permanent limit.
 */
function toProcessingError(error: unknown, usage: 'vision' | 'transcription'): unknown {
  if (!(error instanceof NexoraDocumentAiError)) return error
  switch (error.code) {
    case 'no-model':
      return new PermanentDocumentProcessingError(
        'no_extractable_text',
        usage === 'vision' ? NO_OCR_MODEL_MESSAGE : NO_TRANSCRIPTION_MODEL_MESSAGE,
        error
      )
    case 'unavailable':
    case 'unknown-model':
      return new ProviderCapacityDeferredError('provider_timeout', {
        providerId: 'nexora',
        retryAfterMs: 60_000,
        cause: error,
      })
    case 'refused':
      return new OcrRequestRejectedError(error.status)
    case 'too-long':
    case 'too-many-pages':
      return new PermanentDocumentProcessingError('document_complexity_limit', error.message, error)
    default:
      return error
  }
}

async function mapped<T>(usage: 'vision' | 'transcription', work: () => Promise<T>): Promise<T> {
  try {
    return await work()
  } catch (error) {
    throw toProcessingError(error, usage)
  }
}

/**
 * The first model of a usage in Réglages › Modèles, `null` when there is none (the caller then
 * explains which model to add).
 */
export async function resolveNexoraKnowledgeModel(
  usage: 'vision' | 'transcription',
  signal?: AbortSignal
): Promise<string | null> {
  try {
    return await resolveUsageModel(usage, null, { signal })
  } catch (error) {
    if (error instanceof NexoraDocumentAiError && error.code === 'no-model') return null
    throw toProcessingError(error, usage)
  }
}

function pagesText(data: Record<string, unknown>, model: string): string {
  const { pages } = toOcrResult(data, model)
  if (pages.some((page) => page.truncated)) {
    logger.warn('The vision model stopped at its answer length limit: a page may be cut', {
      model,
    })
  }
  return pages
    .map((page) => page.markdown)
    .filter((markdown) => markdown.trim().length > 0)
    .join('\n\n')
}

/** The deadline and the record a page or piece runs under in a knowledge-base processing slice. */
export interface SliceGuard {
  deadlineAt?: number
  progress?: ProcessingProgressStore
  signal?: AbortSignal
}

function tooLongForThisServer(): PermanentDocumentProcessingError {
  return new PermanentDocumentProcessingError('document_complexity_limit', PIECE_TOO_LONG_MESSAGE)
}

/**
 * Runs the request of one page (or piece) so that it ends before its processing slice does. A
 * request still running then is stopped and noted on the document, and the slice hands over: the
 * next one reads that page again from its start, with a whole slice ahead. A page stopped by two
 * slices in a row will never fit in one on this server, so the document fails with that reason
 * instead of looping until its retry window closes.
 */
export async function runWithinSlice<T>(
  guard: SliceGuard,
  position: number,
  work: (signal?: AbortSignal) => Promise<T>
): Promise<T> {
  const { deadlineAt, progress } = guard
  if (deadlineAt === undefined || !progress) return work(guard.signal)
  const { overrun } = await progress.read()
  const overruns = overrun?.position === position ? overrun.count : 0
  if (overruns >= MAX_SLICE_OVERRUNS) throw tooLongForThisServer()

  const sliceEnd = new AbortController()
  const timer = setTimeout(
    () => sliceEnd.abort(new Error('The processing slice ends before this request')),
    Math.max(0, deadlineAt - OVERRUN_RESERVE_MS - Date.now())
  )
  const signal = guard.signal ? AbortSignal.any([guard.signal, sliceEnd.signal]) : sliceEnd.signal
  try {
    const result = await work(signal)
    if (overrun) await progress.update({ overrun: undefined })
    return result
  } catch (error) {
    if (!sliceEnd.signal.aborted || guard.signal?.aborted) throw error
    const count = overruns + 1
    await progress.update({ overrun: { position, count } })
    if (count >= MAX_SLICE_OVERRUNS) throw tooLongForThisServer()
    logger.info('A page outran its processing slice; the next slice reads it again', { position })
    throw new ProviderCapacityDeferredError('processing_budget', {
      providerId: 'nexora',
      retryAfterMs: 1000,
    })
  } finally {
    clearTimeout(timer)
  }
}

/** Reads one image (shrunk to the model's limit first). */
export function readImageWithNexora(
  image: Buffer,
  model: string,
  guard: SliceGuard = {}
): Promise<string> {
  return mapped('vision', () =>
    runWithinSlice(guard, 0, async (signal) => {
      const { status, data } = await requestOcr(
        { model, document: { type: 'image_url', image_url: await imageDataUri(image, signal) } },
        { signal }
      )
      assertAnswered(status, data, 'Reading the image')
      return pagesText(data, model)
    })
  )
}

/**
 * Reads the batches of a PDF. An OCR model that reads documents (Mistral OCR) gets each batch
 * whole; a vision model refuses the first one (it reads images only), and from then on every
 * page is rendered and sent as an image. That refusal is kept on the document's record, so a
 * later slice of the same pass does not ask again.
 */
export function createNexoraPdfReader(model: string, guard: SliceGuard = {}) {
  let imagesOnly: boolean | undefined
  return (pdf: Buffer, firstPage: number, pageCount: number): Promise<string> =>
    mapped('vision', async () => {
      imagesOnly ??= (await guard.progress?.read())?.imagesOnly === true
      if (!imagesOnly) {
        const { status, data } = await runWithinSlice(guard, firstPage, (signal) =>
          requestOcr(
            {
              model,
              document: {
                type: 'document_url',
                document_url: `data:application/pdf;base64,${pdf.toString('base64')}`,
              },
            },
            { signal }
          )
        )
        if (!readsImagesOnly(status, data)) {
          assertAnswered(status, data, 'Reading the document')
          return pagesText(data, model)
        }
        imagesOnly = true
        await guard.progress?.update({ imagesOnly: true })
      }
      const pages = pageCount > 0 ? pageCount : await countPdfPages(pdf, guard.signal)
      const texts: string[] = []
      for await (const { index, png } of renderPdfPages(
        pdf,
        [...Array(pages).keys()],
        guard.signal
      )) {
        const page = firstPage + index
        texts.push(
          await runWithinSlice(guard, page, async (signal) => {
            const { status, data } = await requestOcr(
              {
                model,
                document: { type: 'image_url', image_url: await imageDataUri(png, signal) },
              },
              { signal }
            )
            assertAnswered(status, data, `Reading page ${page + 1}`)
            return pagesText(data, model)
          })
        )
      }
      return texts.filter(Boolean).join('\n\n')
    })
}

export interface KnowledgeRecording {
  audio: Buffer
  filename: string
  mimeType: string
}

/**
 * Transcribes a recording for a knowledge base with the first Transcription model. It is cut into
 * three-minute pieces; each finished piece is kept in the document's checkpoints and counted on
 * its record, and the run stops between pieces when its processing slice is nearly spent, so the
 * next slice (or a restarted worker) resumes after the last kept piece.
 */
export async function transcribeForKnowledge(
  recording: KnowledgeRecording,
  options: {
    checkpoint?: OcrCheckpointContext
    deadlineAt?: number
    progress?: ProcessingProgressStore
    signal?: AbortSignal
  } = {}
): Promise<string> {
  const model = await resolveNexoraKnowledgeModel('transcription', options.signal)
  if (!model) {
    throw new PermanentDocumentProcessingError(
      'no_extractable_text',
      NO_TRANSCRIPTION_MODEL_MESSAGE
    )
  }
  const checkpoints = options.checkpoint
    ? createOcrCheckpoints({
        context: options.checkpoint,
        source: recording.audio,
        providerIdentity: `nexora-transcription:${model}:${KNOWLEDGE_PIECE_SECONDS}s`,
        policy: TRANSCRIPTION_CHECKPOINT_POLICY,
      })
    : undefined
  const piece = (position: number) => ({ startPage: position, endPage: position })
  const guard: SliceGuard = {
    deadlineAt: options.deadlineAt,
    progress: options.progress,
    signal: options.signal,
  }
  const { transcript } = await mapped('transcription', () =>
    transcribeWithNexora(
      {
        audio: recording.audio,
        fileName: recording.filename,
        mimeType: recording.mimeType,
        model,
      },
      { signal: options.signal },
      {
        chunkSeconds: KNOWLEDGE_PIECE_SECONDS,
        runPiece: (position, transcribe) => runWithinSlice(guard, position, transcribe),
        onProgress: async (done, total) => {
          await options.progress?.update({ unit: 'pieces', done, total })
        },
        ...(checkpoints
          ? {
              recall: (position) =>
                checkpoints.load(piece(position), MAX_TRANSCRIPT_BYTES, options.signal),
              remember: (position, text) =>
                checkpoints.save(piece(position), text, MAX_TRANSCRIPT_BYTES, options.signal),
              beforePiece: () => {
                if (
                  options.deadlineAt !== undefined &&
                  Date.now() + TRANSCRIPTION_PIECE_BUDGET_MS + INDEXING_RESERVE_MS >=
                    options.deadlineAt
                ) {
                  logger.info('Transcription yields before the next piece; it resumes shortly')
                  throw new ProviderCapacityDeferredError('processing_budget', {
                    providerId: 'nexora',
                    retryAfterMs: 1000,
                  })
                }
              },
            }
          : {}),
      }
    )
  )
  return transcript
}
