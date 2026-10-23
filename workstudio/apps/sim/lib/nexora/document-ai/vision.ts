import { toRecord } from '@sim/utils/object'
import {
  assertAnswered,
  callNexoraApi,
  type NexoraApiOptions,
  resolveUsageModel,
} from '@/lib/nexora/document-ai/client'
import { prepareImageForVision } from '@/lib/workspace-files/prepare-image-for-vision'

export interface NexoraOcrPage {
  index: number
  markdown: string
  images: unknown[]
  dimensions?: unknown
  /** Nexora API: the model stopped at its answer length limit, so the text may be cut. */
  truncated?: boolean
}

/** Nexora API's OCR answer, shaped like Mistral OCR's (the Mistral Parser block's outputs). */
export interface NexoraOcrResult {
  pages: NexoraOcrPage[]
  model: string
  usage_info: { pages_processed: number; doc_size_bytes: number | null }
  document_annotation: string | null
}

export function toOcrResult(data: Record<string, unknown>, model: string): NexoraOcrResult {
  const pages = Array.isArray(data.pages)
    ? data.pages.map((item, position) => {
        const page = toRecord(item)
        return {
          ...page,
          index: typeof page.index === 'number' ? page.index : position,
          markdown: typeof page.markdown === 'string' ? page.markdown : '',
          images: Array.isArray(page.images) ? page.images : [],
          truncated: page.truncated === true,
        }
      })
    : []
  const usage = toRecord(data.usage_info)
  return {
    pages,
    model,
    usage_info: {
      pages_processed:
        typeof usage.pages_processed === 'number' ? usage.pages_processed : pages.length,
      doc_size_bytes: typeof usage.doc_size_bytes === 'number' ? usage.doc_size_bytes : null,
    },
    document_annotation:
      typeof data.document_annotation === 'string' ? data.document_annotation : null,
  }
}

/** One `/ocr` request; a refusal comes back as-is so the caller can try another way. */
export async function requestOcr(
  body: Record<string, unknown>,
  options: NexoraApiOptions
): Promise<{ status: number; data: Record<string, unknown> }> {
  return callNexoraApi('/ocr', { body: JSON.stringify(body), json: true }, options)
}

/**
 * Turns image bytes into what a vision model accepts: PNG, JPEG, WebP or GIF, at most 1568 px on
 * a side and 5 MB, as a data URI. Larger images are shrunk first.
 */
export async function imageDataUri(image: Buffer, signal?: AbortSignal): Promise<string> {
  const prepared = await prepareImageForVision(image, signal)
  return `data:${prepared.mediaType};base64,${prepared.buffer.toString('base64')}`
}

export interface DescribeImageInput {
  image: Buffer
  prompt: string
  model?: string | null
}

/**
 * The Vision block with the Nexora provider: a Vision / OCR model answers the block's prompt
 * about the image (Nexora API's OCR route, the prompt as `document_annotation_prompt`). An OCR
 * model that cannot answer a prompt (Mistral OCR) returns the text it read instead.
 */
export async function describeImage(
  input: DescribeImageInput,
  options: NexoraApiOptions = {}
): Promise<{ content: string; model: string }> {
  const model = await resolveUsageModel('vision', input.model, options)
  const imageUrl = await imageDataUri(input.image, options.signal)
  const { status, data } = await requestOcr(
    {
      model,
      document: { type: 'image_url', image_url: imageUrl },
      document_annotation_prompt: input.prompt,
    },
    options
  )
  assertAnswered(status, data, 'Image analysis')
  const result = toOcrResult(data, model)
  const content =
    result.document_annotation ??
    result.pages
      .map((page) => page.markdown)
      .filter(Boolean)
      .join('\n\n')
  return { content, model }
}
