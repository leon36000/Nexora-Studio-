import { createCanvas } from '@napi-rs/canvas'
import { openPdfDocument } from '@/lib/file-parsers/pdfjs-server'

/** Longest side of a rendered page, the size vision models read best (and the image limit). */
const PAGE_MAX_DIMENSION = 1568

/** Number of pages of a PDF. */
export async function countPdfPages(pdf: Buffer, signal?: AbortSignal): Promise<number> {
  const document = await openPdfDocument(new Uint8Array(pdf), signal)
  try {
    return document.numPages
  } finally {
    await document.destroy().catch(() => undefined)
  }
}

/**
 * Renders the chosen pages (zero-based) of a PDF as PNG images on a white background, at most
 * 1568 px on a side, one at a time so a long document never sits in memory as images.
 */
export async function* renderPdfPages(
  pdf: Buffer,
  pages: readonly number[],
  signal?: AbortSignal
): AsyncGenerator<{ index: number; png: Buffer }> {
  const document = await openPdfDocument(new Uint8Array(pdf), signal)
  try {
    for (const index of pages) {
      signal?.throwIfAborted()
      const page = await document.getPage(index + 1)
      const natural = page.getViewport({ scale: 1 })
      const scale = PAGE_MAX_DIMENSION / Math.max(natural.width, natural.height)
      const viewport = page.getViewport({ scale })
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
      const context = canvas.getContext('2d')
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      await page.render({
        // double-cast-allowed: @napi-rs/canvas implements the 2D context pdf.js draws on
        canvasContext: context as unknown as CanvasRenderingContext2D,
        // double-cast-allowed: pdf.js only reads the canvas size
        canvas: canvas as unknown as HTMLCanvasElement,
        viewport,
      }).promise
      page.cleanup()
      yield { index, png: await canvas.encode('png') }
    }
  } finally {
    await document.destroy().catch(() => undefined)
  }
}
