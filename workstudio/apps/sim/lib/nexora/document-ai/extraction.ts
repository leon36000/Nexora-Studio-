import { toRecord } from '@sim/utils/object'
import { createTranslator } from 'next-intl'
import { DEFAULT_LOCALE } from '@/lib/i18n/config'
import {
  assertAnswered,
  type NexoraApiOptions,
  NexoraDocumentAiError,
  resolveUsageModel,
} from '@/lib/nexora/document-ai/client'
import { annotationFormat, type ExtractionField } from '@/lib/nexora/document-ai/fields'
import { readsImagesOnly } from '@/lib/nexora/document-ai/ocr'
import { imageDataUri, requestOcr, toOcrResult } from '@/lib/nexora/document-ai/vision'
import { DEFAULT_MODEL_ALIAS } from '@/lib/nexora/model-ids'
import enErrors from '@/messages/en/errors.json'
import frErrors from '@/messages/fr/errors.json'

/**
 * Nexora edition: « Extraire des données ». Nexora API reads the document (text layer, or the
 * vision model page by page) and has a chat model fill a JSON Schema built from the fields
 * (`/ocr` with `document_annotation_format`); this module turns the answer into checked values —
 * French amounts and dates normalised, required fields and HT + TVA = TTC verified — and raises
 * « à vérifier » with its reasons instead of failing, so a person reviews the document.
 */

/** Amounts that must add up when a schema has all three. */
const TOTALS = { net: 'total_ht', tax: 'total_tva', gross: 'total_ttc' } as const
const TOTALS_TOLERANCE = 0.02

function issueTranslator() {
  const errors = DEFAULT_LOCALE === 'en' ? enErrors : frErrors
  return createTranslator({
    locale: DEFAULT_LOCALE,
    messages: { errors },
    namespace: 'errors.extraction',
  })
}

/** « 1 234,56 € », « 1.234,56 », « 1,234.56 », « 12,5 % » ⇒ a number; anything else ⇒ `null`. */
function parseAmount(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const compact = value
    .replace(/[\s  ']/g, '')
    .replace(/(eur|euros?|€|usd|\$|chf|gbp|£|%)$/i, '')
    .replace(/^(eur|€|\$|£)/i, '')
  if (!/^[-+]?\d[\d.,]*$/.test(compact)) return null
  const lastComma = compact.lastIndexOf(',')
  const lastDot = compact.lastIndexOf('.')
  let normalised: string
  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? ',' : '.'
    const thousands = decimal === ',' ? '.' : ','
    normalised = compact.split(thousands).join('').replace(decimal, '.')
  } else if (lastComma >= 0) {
    normalised =
      compact.split(',').length > 2 ? compact.split(',').join('') : compact.replace(',', '.')
  } else if (lastDot >= 0) {
    const parts = compact.split('.')
    const thousands = parts.length > 2 || (parts.length === 2 && parts[1].length === 3)
    normalised = thousands ? parts.join('') : compact
  } else {
    normalised = compact
  }
  const parsed = Number(normalised)
  return Number.isFinite(parsed) ? parsed : null
}

const MONTHS: Record<string, number> = {
  janvier: 1,
  fevrier: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  aout: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  decembre: 12,
}

function isoDate(year: number, month: number, day: number): string | null {
  const fullYear = year < 100 ? 2000 + year : year
  const date = new Date(Date.UTC(fullYear, month - 1, day))
  if (
    date.getUTCFullYear() !== fullYear ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  return date.toISOString().slice(0, 10)
}

/** « 2026-03-15 », « 15/03/2026 », « 15.03.26 », « 15 mars 2026 », « 1er avril 2026 » ⇒ ISO. */
function parseDate(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text)
  if (match) return isoDate(Number(match[1]), Number(match[2]), Number(match[3]))
  match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(text)
  if (match) return isoDate(Number(match[3]), Number(match[2]), Number(match[1]))
  const words = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  match = /^(\d{1,2})(?:er)?\s+([a-z]+)\.?\s+(\d{4})$/.exec(words)
  const month = match ? MONTHS[match[2]] : undefined
  if (match && month) return isoDate(Number(match[3]), month, Number(match[1]))
  return null
}

function parseBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (typeof value !== 'string') return null
  const text = value.trim().toLowerCase()
  if (['true', 'oui', 'yes', 'vrai'].includes(text)) return true
  if (['false', 'non', 'no', 'faux'].includes(text)) return false
  return null
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'string' && !value.trim())
}

export interface ExtractionValidation {
  /** One entry per field, `null` when absent or unreadable. */
  data: Record<string, unknown>
  /** A person should check this document: a field is missing or unreadable, or totals differ. */
  toVerify: boolean
  /** Why, in the instance language. */
  issues: string[]
}

/** Checks a model's answer against the fields; never throws, flags instead. */
export function validateExtraction(
  raw: unknown,
  fields: readonly ExtractionField[],
  options: { failure?: string | null } = {}
): ExtractionValidation {
  const t = issueTranslator()
  const issues: string[] = []
  const answer =
    raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? toRecord(raw) : null
  if (!answer)
    issues.push(options.failure ? t('noAnswerBecause', { reason: options.failure }) : t('noAnswer'))

  const data: Record<string, unknown> = {}
  for (const item of fields) {
    const value = answer?.[item.name]
    if (isEmpty(value)) {
      data[item.name] = null
      if (answer && item.required) issues.push(t('missing', { field: item.name }))
      continue
    }
    let checked: unknown
    switch (item.type) {
      case 'number':
        checked = parseAmount(value)
        break
      case 'date':
        checked = parseDate(value)
        break
      case 'boolean':
        checked = parseBoolean(value)
        break
      case 'array':
        checked = Array.isArray(value) ? value : null
        break
      case 'object':
        checked =
          value !== null && typeof value === 'object' && !Array.isArray(value) ? value : null
        break
      default:
        checked =
          typeof value === 'string'
            ? value.trim()
            : typeof value === 'number'
              ? String(value)
              : null
    }
    data[item.name] = checked
    if (checked === null) {
      issues.push(t('invalid', { field: item.name, type: item.type, value: JSON.stringify(value) }))
    }
  }

  const net = data[TOTALS.net]
  const tax = data[TOTALS.tax]
  const gross = data[TOTALS.gross]
  if (typeof net === 'number' && typeof tax === 'number' && typeof gross === 'number') {
    const sum = Math.round((net + tax) * 100) / 100
    if (Math.abs(sum - gross) > TOTALS_TOLERANCE + Number.EPSILON) {
      issues.push(t('totals', { sum: sum.toFixed(2), gross: gross.toFixed(2) }))
    }
  }
  return { data, toVerify: issues.length > 0, issues }
}

export interface ExtractDocumentInput {
  file: Buffer
  mimeType: string
  fields: readonly ExtractionField[]
  instructions?: string | null
  /** A Vision / OCR model of Réglages › Modèles; empty for the first one. */
  visionModel?: string | null
  /** The chat model that fills the schema; empty for the instance's default model. */
  model?: string | null
  pages?: readonly number[]
}

export interface ExtractionOutput extends ExtractionValidation {
  /** The data plus `a_verifier` and `motifs`, ready to insert into a table. */
  row: Record<string, unknown>
  /** The document as read, in Markdown (tables included). */
  markdown: string
  model: string
  visionModel: string
}

function isPdf(file: Buffer, mimeType: string): boolean {
  return mimeType === 'application/pdf' || file.subarray(0, 1024).includes('%PDF-')
}

/** One `/ocr` request with the fields as a JSON Schema, then the checked values. */
export async function extractDocumentData(
  input: ExtractDocumentInput,
  options: NexoraApiOptions = {}
): Promise<ExtractionOutput> {
  if (input.fields.length === 0) {
    throw new NexoraDocumentAiError('refused', 'Add at least one field to extract')
  }
  const visionModel = await resolveUsageModel('vision', input.visionModel, options)
  const model = input.model?.trim().replace(/^vllm\//, '') || DEFAULT_MODEL_ALIAS
  const document = isPdf(input.file, input.mimeType)
    ? {
        type: 'document_url',
        document_url: `data:application/pdf;base64,${input.file.toString('base64')}`,
      }
    : { type: 'image_url', image_url: await imageDataUri(input.file, options.signal) }
  const instructions = input.instructions?.trim()
  const { status, data } = await requestOcr(
    {
      model: visionModel,
      document,
      document_annotation_format: annotationFormat(input.fields),
      annotation_model: model,
      ...(instructions ? { document_annotation_prompt: instructions } : {}),
      ...(input.pages?.length ? { pages: input.pages } : {}),
    },
    options
  )
  if (readsImagesOnly(status, data)) {
    throw new NexoraDocumentAiError(
      'too-many-pages',
      'This scan has more pages than one extraction reads (10): choose the pages to read'
    )
  }
  assertAnswered(status, data, 'Data extraction')
  const result = toOcrResult(data, visionModel)
  const failure =
    typeof data.document_annotation_error === 'string' ? data.document_annotation_error : null
  let raw: unknown = null
  if (result.document_annotation) {
    try {
      raw = JSON.parse(result.document_annotation)
    } catch {
      raw = null
    }
  }
  const validation = validateExtraction(raw, input.fields, { failure })
  return {
    ...validation,
    row: {
      ...validation.data,
      a_verifier: validation.toVerify,
      motifs: validation.issues.join(' ; '),
    },
    markdown: result.pages
      .map((page) => page.markdown)
      .filter((markdown) => markdown.trim())
      .join('\n\n'),
    model,
    visionModel,
  }
}
