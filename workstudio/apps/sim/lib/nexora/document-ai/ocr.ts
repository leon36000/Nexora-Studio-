import {
  assertAnswered,
  type NexoraApiOptions,
  NexoraDocumentAiError,
  refusalDetail,
  resolveUsageModel,
} from '@/lib/nexora/document-ai/client'
import { countPdfPages, renderPdfPages } from '@/lib/nexora/document-ai/pdf'
import {
  imageDataUri,
  type NexoraOcrPage,
  type NexoraOcrResult,
  requestOcr,
  toOcrResult,
} from '@/lib/nexora/document-ai/vision'

/**
 * Pages one block run reads image by image with a local vision model (a few seconds to a minute
 * each on a CPU). Longer scans belong in a knowledge base, which reads them in the background.
 */
const MAX_RENDERED_PAGES = 50

export interface OcrDocumentInput {
  file: Buffer
  mimeType: string
  model?: string | null
  /** Zero-based pages to read; all when absent. */
  pages?: readonly number[]
  maxPages?: number
}

function isPdf(file: Buffer, mimeType: string): boolean {
  return mimeType === 'application/pdf' || file.subarray(0, 1024).includes('%PDF-')
}

/** A vision model reads images only: Nexora API refuses a PDF with a validation error (422). */
export function readsImagesOnly(status: number, data: Record<string, unknown>): boolean {
  return status === 422 && /images only/i.test(refusalDetail(data, status))
}

async function ocrPdfPageByPage(
  pdf: Buffer,
  model: string,
  input: OcrDocumentInput,
  options: NexoraApiOptions
): Promise<NexoraOcrResult> {
  const total = await countPdfPages(pdf, options.signal)
  const wanted = (input.pages?.length ? input.pages : [...Array(total).keys()]).filter(
    (index) => index >= 0 && index < total
  )
  const limit = input.maxPages ?? MAX_RENDERED_PAGES
  if (wanted.length > limit) {
    throw new NexoraDocumentAiError(
      'too-many-pages',
      `This document has ${wanted.length} pages to read; a block reads at most ${limit} with a vision model. Choose pages, or add the document to a knowledge base`
    )
  }
  const pages: NexoraOcrPage[] = []
  for await (const { index, png } of renderPdfPages(pdf, wanted, options.signal)) {
    const { status, data } = await requestOcr(
      {
        model,
        document: { type: 'image_url', image_url: await imageDataUri(png, options.signal) },
      },
      options
    )
    assertAnswered(status, data, `Reading page ${index + 1}`)
    const markdown = toOcrResult(data, model)
      .pages.map((page) => page.markdown)
      .join('\n\n')
    pages.push({ index, markdown, images: [] })
  }
  return {
    pages,
    model,
    usage_info: { pages_processed: pages.length, doc_size_bytes: pdf.length },
    document_annotation: null,
  }
}

/**
 * The OCR block with the Nexora provider. An image is shrunk to the model's limit and read in one
 * request. A PDF goes whole to an OCR model that reads documents (Mistral OCR); a vision model
 * that reads images only refuses it, and the PDF is then read page by page as images.
 */
export async function ocrDocument(
  input: OcrDocumentInput,
  options: NexoraApiOptions = {}
): Promise<NexoraOcrResult> {
  const model = await resolveUsageModel('vision', input.model, options)
  if (!isPdf(input.file, input.mimeType)) {
    const { status, data } = await requestOcr(
      {
        model,
        document: { type: 'image_url', image_url: await imageDataUri(input.file, options.signal) },
      },
      options
    )
    assertAnswered(status, data, 'Reading the image')
    return toOcrResult(data, model)
  }

  const { status, data } = await requestOcr(
    {
      model,
      document: {
        type: 'document_url',
        document_url: `data:application/pdf;base64,${input.file.toString('base64')}`,
      },
      ...(input.pages?.length ? { pages: input.pages } : {}),
    },
    options
  )
  if (readsImagesOnly(status, data)) return ocrPdfPageByPage(input.file, model, input, options)
  assertAnswered(status, data, 'Reading the document')
  return toOcrResult(data, model)
}
