import { createLogger } from '@sim/logger'
import { env } from '@/lib/core/config/env'
import { ProviderCapacityDeferredError } from '@/lib/core/rate-limiter/provider-capacity-error'
import {
  createOcrCheckpoints,
  type OcrCheckpointContext,
} from '@/lib/knowledge/documents/ocr-checkpoints'
import type { OcrRequestPolicy } from '@/lib/knowledge/documents/ocr-request-policy'
import {
  OcrRequestRejectedError,
  PermanentDocumentProcessingError,
} from '@/lib/knowledge/documents/processing-error'
import {
  assertAnswered,
  NexoraDocumentAiError,
  resolveUsageModel,
} from '@/lib/nexora/document-ai/client'
import { readsImagesOnly } from '@/lib/nexora/document-ai/ocr'
import { countPdfPages, renderPdfPages } from '@/lib/nexora/document-ai/pdf'
import { transcribeWithNexora } from '@/lib/nexora/document-ai/transcription'
import { imageDataUri, requestOcr, toOcrResult } from '@/lib/nexora/document-ai/vision'
import { NO_TRANSCRIPTION_MODEL_MESSAGE } from '@/lib/nexora/knowledge-errors'
import { getFileExtension } from '@/lib/uploads/utils/file'
import { normalizeMimeType } from '@/lib/uploads/utils/mime'

const logger = createLogger('NexoraKnowledgeExtraction')

/**
 * Pages read per batch. A vision model reads a page at a time, from a few seconds on a GPU to a
 * minute or two on a CPU; each batch is saved before the next starts, so a 300-page scan read
 * over many processing slices (or across a restart) never reads a saved batch again.
 */
const NEXORA_OCR_PAGES_PER_BATCH = 2
const NEXORA_OCR_PAGE_BUDGET_MS = 120_000

/** Splits scans into small batches, one request at a time; Nexora API serves one model per call. */
export const NEXORA_OCR_REQUEST_POLICY = {
  maxBytes: 50_000_000,
  maxPages: NEXORA_OCR_PAGES_PER_BATCH,
  maxChunks: 5_000,
  concurrency: 1,
} as const satisfies OcrRequestPolicy

/** Time a batch may take: a slice starts another batch only when this much is left. */
export const NEXORA_OCR_BATCH_BUDGET_MS = NEXORA_OCR_PAGES_PER_BATCH * NEXORA_OCR_PAGE_BUDGET_MS

/** A ten-minute piece of speech on a CPU Whisper, with margin. */
const TRANSCRIPTION_PIECE_BUDGET_MS = 300_000
/** Time kept after the last piece for chunking, embedding and the index write. */
const INDEXING_RESERVE_MS = 75_000
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
  'audio/webm',
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

/**
 * Maps a Nexora API failure onto the knowledge pipeline's vocabulary: an unreachable service
 * becomes a durable wait (the document resumes later instead of burning its retries), a refusal
 * stops automatic retries, an over-long recording is a permanent limit.
 */
function toProcessingError(error: unknown): unknown {
  if (!(error instanceof NexoraDocumentAiError)) return error
  switch (error.code) {
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

async function mapped<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work()
  } catch (error) {
    throw toProcessingError(error)
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
    throw toProcessingError(error)
  }
}

function pagesText(data: Record<string, unknown>, model: string): string {
  return toOcrResult(data, model)
    .pages.map((page) => page.markdown)
    .filter((markdown) => markdown.trim().length > 0)
    .join('\n\n')
}

/** Reads one image (shrunk to the model's limit first). */
export function readImageWithNexora(
  image: Buffer,
  model: string,
  signal?: AbortSignal
): Promise<string> {
  return mapped(async () => {
    const { status, data } = await requestOcr(
      { model, document: { type: 'image_url', image_url: await imageDataUri(image, signal) } },
      { signal }
    )
    assertAnswered(status, data, 'Reading the image')
    return pagesText(data, model)
  })
}

/**
 * Reads the batches of a PDF. An OCR model that reads documents (Mistral OCR) gets each batch
 * whole; a vision model refuses the first one (it reads images only), and from then on every
 * page is rendered and sent as an image, without asking again.
 */
export function createNexoraPdfReader(model: string, signal?: AbortSignal) {
  let imagesOnly = false
  return (pdf: Buffer, pageCount: number): Promise<string> =>
    mapped(async () => {
      if (!imagesOnly) {
        const { status, data } = await requestOcr(
          {
            model,
            document: {
              type: 'document_url',
              document_url: `data:application/pdf;base64,${pdf.toString('base64')}`,
            },
          },
          { signal }
        )
        if (!readsImagesOnly(status, data)) {
          assertAnswered(status, data, 'Reading the document')
          return pagesText(data, model)
        }
        imagesOnly = true
      }
      const pages = pageCount > 0 ? pageCount : await countPdfPages(pdf, signal)
      const texts: string[] = []
      for await (const { index, png } of renderPdfPages(pdf, [...Array(pages).keys()], signal)) {
        const { status, data } = await requestOcr(
          { model, document: { type: 'image_url', image_url: await imageDataUri(png, signal) } },
          { signal }
        )
        assertAnswered(status, data, `Reading page ${index + 1}`)
        texts.push(pagesText(data, model))
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
 * Transcribes a recording for a knowledge base with the first Transcription model. A long
 * recording is cut into ten-minute pieces; each finished piece is kept in the document's
 * checkpoints, and the run stops between pieces when its processing slice is nearly spent, so the
 * next slice (or a restarted worker) resumes after the last kept piece.
 */
export async function transcribeForKnowledge(
  recording: KnowledgeRecording,
  options: { checkpoint?: OcrCheckpointContext; deadlineAt?: number; signal?: AbortSignal } = {}
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
        providerIdentity: `nexora-transcription:${model}`,
        policy: TRANSCRIPTION_CHECKPOINT_POLICY,
      })
    : undefined
  const piece = (position: number) => ({ startPage: position, endPage: position })
  const { transcript } = await mapped(() =>
    transcribeWithNexora(
      {
        audio: recording.audio,
        fileName: recording.filename,
        mimeType: recording.mimeType,
        model,
      },
      { signal: options.signal },
      checkpoints
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
        : {}
    )
  )
  return transcript
}
