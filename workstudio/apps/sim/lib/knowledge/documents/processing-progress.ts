import { db } from '@sim/db'
import { document } from '@sim/db/schema'
import { toNumberOrNull } from '@sim/utils/coerce'
import { isRecordLike, toRecordOrNull } from '@sim/utils/object'
import { eq } from 'drizzle-orm'

/** Where a long reading (pages) or transcription (pieces) of a document stands. */
export interface ProcessingProgress {
  unit: 'pages' | 'pieces'
  done: number
  total: number
}

/**
 * What the current indexing pass of a document knows across its processing slices and restarts:
 * its progress, what it learned about the file, and a page or piece that outran its slice.
 */
export interface ProcessingProgressRecord extends Partial<ProcessingProgress> {
  passId: string
  /** The Vision / OCR model refused the PDF: it reads images only, so pages go as images. */
  imagesOnly?: boolean
  /** The PDF has no usable text layer: it is not parsed again before OCR. */
  noTextLayer?: boolean
  /** The page or piece whose request its slice had to stop, and how many times in a row. */
  overrun?: { position: number; count: number }
}

type ProcessingProgressPatch = Partial<Omit<ProcessingProgressRecord, 'passId'>>

/** Reads and updates a pass's record; a record of another pass reads as empty. */
export interface ProcessingProgressStore {
  read(): Promise<ProcessingProgressRecord>
  update(patch: ProcessingProgressPatch): Promise<void>
}

/** The public part of a stored record: what the document list shows while it is read. */
export function toProcessingProgress(stored: unknown): ProcessingProgress | null {
  if (!isRecordLike(stored)) return null
  const unit = stored.unit
  const done = toNumberOrNull(stored.done)
  const total = toNumberOrNull(stored.total)
  if ((unit !== 'pages' && unit !== 'pieces') || done === null || total === null || total <= 0) {
    return null
  }
  return { unit, done: Math.min(Math.max(0, done), total), total }
}

function toRecordOfPass(stored: unknown, passId: string): ProcessingProgressRecord {
  if (!isRecordLike(stored) || stored.passId !== passId) return { passId }
  const record: ProcessingProgressRecord = { passId, ...toProcessingProgress(stored) }
  if (stored.imagesOnly === true) record.imagesOnly = true
  if (stored.noTextLayer === true) record.noTextLayer = true
  const overrun = toRecordOrNull(stored.overrun)
  const position = toNumberOrNull(overrun?.position)
  const count = toNumberOrNull(overrun?.count)
  if (position !== null && count !== null) record.overrun = { position, count }
  return record
}

/**
 * A store over a record already loaded: writes go through `persist` only when something changed,
 * so a slice resuming over saved pages does not rewrite the same progress page after page.
 */
export function createProcessingProgressStore(
  passId: string,
  load: () => Promise<unknown>,
  persist: (record: ProcessingProgressRecord) => Promise<void>
): ProcessingProgressStore {
  let current: ProcessingProgressRecord | undefined
  const read = async () => {
    current ??= toRecordOfPass(await load(), passId)
    return current
  }
  return {
    read,
    async update(patch) {
      const base = await read()
      const next: ProcessingProgressRecord = { ...base, ...patch, passId }
      if (JSON.stringify(next) === JSON.stringify(base)) return
      current = next
      await persist(next)
    },
  }
}

/** The record of a document's indexing pass, kept in `document.processing_progress`. */
export function createDocumentProgressStore(
  documentId: string,
  passId: string
): ProcessingProgressStore {
  return createProcessingProgressStore(
    passId,
    async () => {
      const [row] = await db
        .select({ progress: document.processingProgress })
        .from(document)
        .where(eq(document.id, documentId))
        .limit(1)
      return row?.progress ?? null
    },
    async (record) => {
      await db
        .update(document)
        .set({ processingProgress: record })
        .where(eq(document.id, documentId))
    }
  )
}
