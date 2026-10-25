import { isRecordLike } from '@sim/utils/object'
import { truncate } from '@sim/utils/string'
import { MAX_DATASET_ROWS } from '@/lib/nexora/evaluations/types'
import { detectCsvDelimiter, parseCsvBuffer } from '@/lib/table/import'

/** One row of a test set before it is stored. */
export interface RowDraft {
  input: string
  expected: string | null
  guidance: string | null
  /** An answer already given (a trace, a conversation, or one annotated by a person). */
  candidate: string | null
  humanVerdict: 'pass' | 'fail' | null
  humanNote: string | null
  sourceRef: string | null
}

/** The column of the source that feeds each field of a row; absent fields stay empty. */
export interface ColumnMapping {
  input?: string
  expected?: string
  guidance?: string
  candidate?: string
  verdict?: string
  justification?: string
}

/** The source cannot become a test set; the message is meant for the person importing. */
export class DatasetImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DatasetImportError'
  }
}

const FIELD_LIMIT = 20_000

function spaced(count: number): string {
  return String(count).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

function normalizeHeader(header: string): string {
  return header
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ')
    .trim()
}

const ALIASES: Record<keyof ColumnMapping, string[]> = {
  input: ['question', 'questions', 'input', 'entree', 'prompt', 'q'],
  expected: [
    'attendu',
    'reponse attendue',
    'expected',
    'expected answer',
    'reference',
    'answer',
    'bonne reponse',
  ],
  guidance: ['consigne', 'consigne de notation', 'guidance', 'grading guidance', 'criteres'],
  candidate: ['reponse', 'candidate', 'output', 'sortie', 'reponse annotee', 'reponse donnee'],
  verdict: ['verdict', 'annotation', 'jugement', 'avis humain'],
  justification: ['justification', 'note', 'commentaire', 'raison'],
}

/** Picks, for each field, the first column whose name is one of its usual names. */
export function guessMapping(headers: readonly string[]): ColumnMapping {
  const mapping: ColumnMapping = {}
  const normalized = headers.map((header) => [header, normalizeHeader(header)] as const)
  for (const field of Object.keys(ALIASES) as (keyof ColumnMapping)[]) {
    const found = normalized.find(([, name]) => ALIASES[field].includes(name))
    if (found) mapping[field] = found[0]
  }
  return mapping
}

const PASS_WORDS = new Set([
  'pass',
  'oui',
  'ok',
  'correct',
  'bon',
  'vrai',
  'true',
  '1',
  'reussi',
  'valide',
])
const FAIL_WORDS = new Set([
  'fail',
  'non',
  'incorrect',
  'faux',
  'false',
  '0',
  'echec',
  'mauvais',
  'ko',
])

function toVerdict(value: string | null): 'pass' | 'fail' | null {
  if (value === null) return null
  const word = normalizeHeader(value)
  if (PASS_WORDS.has(word)) return 'pass'
  if (FAIL_WORDS.has(word)) return 'fail'
  return null
}

function toText(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const text =
    typeof value === 'string'
      ? value
      : isRecordLike(value) || Array.isArray(value)
        ? JSON.stringify(value)
        : String(value)
  const trimmed = text.trim()
  return trimmed.length > 0 ? truncate(trimmed, FIELD_LIMIT) : null
}

/** A conversation line (`{"messages": [...]}`) as a question and its reference answer. */
function flattenConversation(record: Record<string, unknown>): Record<string, unknown> {
  if (!Array.isArray(record.messages)) return record
  const messages = record.messages.filter(isRecordLike)
  const lastUser = [...messages].reverse().find((message) => message.role === 'user')
  const lastAssistant = [...messages].reverse().find((message) => message.role === 'assistant')
  return { question: lastUser?.content ?? null, attendu: lastAssistant?.content ?? null }
}

/** Rows from records already parsed (CSV lines, JSONL objects, rows of a table). */
export function rowsFromRecords(
  records: readonly Record<string, unknown>[],
  mapping?: ColumnMapping
): { rows: RowDraft[]; skipped: number } {
  if (records.length > MAX_DATASET_ROWS) {
    throw new DatasetImportError(
      `Un jeu de tests contient au plus ${spaced(MAX_DATASET_ROWS)} lignes : la source en a ${spaced(records.length)}.`
    )
  }
  const flattened = records.map(flattenConversation)
  const headers = [...new Set(flattened.slice(0, 200).flatMap((record) => Object.keys(record)))]
  const columns = { ...guessMapping(headers), ...mapping }
  if (!columns.input) {
    throw new DatasetImportError(
      `Aucune colonne de question reconnue (« question », « entrée »…). Colonnes trouvées : ${headers.join(', ') || 'aucune'}.`
    )
  }
  const read = (record: Record<string, unknown>, column: string | undefined) =>
    column ? toText(record[column]) : null

  const rows: RowDraft[] = []
  let skipped = 0
  for (const record of flattened) {
    const input = read(record, columns.input)
    if (!input) {
      skipped += 1
      continue
    }
    rows.push({
      input,
      expected: read(record, columns.expected),
      guidance: read(record, columns.guidance),
      candidate: read(record, columns.candidate),
      humanVerdict: toVerdict(read(record, columns.verdict)),
      humanNote: read(record, columns.justification),
      sourceRef: null,
    })
  }
  return { rows, skipped }
}

/** Rows from a CSV text, any usual separator, with the BOM and quotes handled. */
export async function parseCsvRows(
  text: string,
  mapping?: ColumnMapping
): Promise<{ rows: RowDraft[]; skipped: number }> {
  let parsed: Awaited<ReturnType<typeof parseCsvBuffer>>
  try {
    const delimiter = await detectCsvDelimiter(text, ',', { complete: true })
    parsed = await parseCsvBuffer(text, delimiter)
  } catch {
    throw new DatasetImportError('Ce fichier CSV est vide ou illisible.')
  }
  const result = rowsFromRecords(parsed.rows, mapping)
  return { rows: result.rows, skipped: result.skipped + parsed.rejections.rowsRejected }
}

/** Rows from a JSONL text: one JSON object per line; unreadable lines are counted, not fatal. */
export function parseJsonlRows(
  text: string,
  mapping?: ColumnMapping
): { rows: RowDraft[]; skipped: number } {
  const records: Record<string, unknown>[] = []
  let unreadable = 0
  for (const line of text.split(/\r?\n/)) {
    if (line.trim().length === 0) continue
    try {
      const parsed: unknown = JSON.parse(line)
      if (isRecordLike(parsed)) records.push(parsed)
      else unreadable += 1
    } catch {
      unreadable += 1
    }
  }
  const result = rowsFromRecords(records, mapping)
  return { rows: result.rows, skipped: result.skipped + unreadable }
}

/** Rows from traces: the question asked and the answer the model gave. */
export function rowsFromTraces(
  traces: readonly { id: string; input: string | null; output: string | null }[]
): RowDraft[] {
  const rows: RowDraft[] = []
  for (const trace of traces) {
    const input = toText(trace.input)
    if (!input) continue
    rows.push({
      input,
      expected: null,
      guidance: null,
      candidate: toText(trace.output),
      humanVerdict: null,
      humanNote: null,
      sourceRef: `trace:${trace.id}`,
    })
  }
  return rows
}

/** Rows from an Assistant conversation: one per question that got a whole answer. */
export function rowsFromConversation(
  conversationId: string,
  messages: readonly { role: string; content: string; interrupted?: boolean }[]
): RowDraft[] {
  const rows: RowDraft[] = []
  messages.forEach((message, index) => {
    if (message.role !== 'user') return
    const input = toText(message.content)
    const answer = messages[index + 1]
    if (!input || !answer || answer.role !== 'assistant' || answer.interrupted) return
    rows.push({
      input,
      expected: null,
      guidance: null,
      candidate: toText(answer.content),
      humanVerdict: null,
      humanNote: null,
      sourceRef: `conversation:${conversationId}:${index}`,
    })
  })
  return rows
}
