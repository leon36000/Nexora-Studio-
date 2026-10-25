import { isRecordLike } from '@sim/utils/object'
import {
  type BatchEndpoint,
  DEFAULT_COMPLETION_HOURS,
  MAX_BATCH_LINE_BYTES,
  MAX_BATCH_LINES,
  MAX_COMPLETION_HOURS,
  MAX_REPORTED_LINE_ERRORS,
} from '@/lib/nexora/batches/types'
import { isAgentModel } from '@/lib/nexora/developer-api/policy'

/** One request of a batch input file. */
interface BatchLine {
  /** Order among the file's requests, from 0. */
  position: number
  customId: string
  body: Record<string, unknown>
}

/** Why an input file is refused; `line` is the 1-based line of the file, `null` for the file as a whole. */
interface BatchLineError {
  code: string
  message: string
  line: number | null
}

export type ParsedBatch =
  | { ok: true; lines: BatchLine[]; model: string }
  | { ok: false; errors: BatchLineError[] }

interface ParseOptions {
  maxLines?: number
  maxLineBytes?: number
}

const MAX_CUSTOM_ID_LENGTH = 512

/**
 * Reads and checks a batch input file (JSONL, one request per line): same model everywhere, a
 * unique `custom_id`, the endpoint's own url, no streaming, no agent. Blank lines are skipped. A
 * refusal lists the first problems with their line numbers, in French.
 */
export function parseBatchInput(
  text: string,
  endpoint: BatchEndpoint,
  options: ParseOptions = {}
): ParsedBatch {
  const maxLines = options.maxLines ?? MAX_BATCH_LINES
  const maxLineBytes = options.maxLineBytes ?? MAX_BATCH_LINE_BYTES
  const rows = text
    .split('\n')
    .map((raw, index) => ({ raw: raw.trim(), line: index + 1 }))
    .filter((row) => row.raw !== '')
  if (rows.length === 0) {
    return {
      ok: false,
      errors: [
        { code: 'empty_file', line: null, message: 'Le fichier ne contient aucune requête.' },
      ],
    }
  }
  if (rows.length > maxLines) {
    return {
      ok: false,
      errors: [
        {
          code: 'too_many_tasks',
          line: null,
          message: `Le fichier contient ${rows.length} requêtes ; un lot en accepte ${maxLines} au plus. Découpez-le en plusieurs fichiers.`,
        },
      ],
    }
  }

  const errors: BatchLineError[] = []
  const report = (code: string, line: number, message: string) => {
    if (errors.length < MAX_REPORTED_LINE_ERRORS) {
      errors.push({ code, line, message: `Ligne ${line} : ${message}` })
    }
  }
  const lines: BatchLine[] = []
  const seen = new Map<string, number>()
  let model: string | null = null

  for (const row of rows) {
    if (Buffer.byteLength(row.raw, 'utf8') > maxLineBytes) {
      report('line_too_long', row.line, 'la requête dépasse la taille maximale d’une ligne.')
      continue
    }
    let value: unknown
    try {
      value = JSON.parse(row.raw)
    } catch {
      report('invalid_json_line', row.line, 'ce n’est pas du JSON valide.')
      continue
    }
    if (!isRecordLike(value)) {
      report('invalid_json_line', row.line, 'la ligne doit être un objet JSON.')
      continue
    }
    const customId = value.custom_id
    if (typeof customId !== 'string' || customId === '' || customId.length > MAX_CUSTOM_ID_LENGTH) {
      report(
        'invalid_request',
        row.line,
        '« custom_id » est obligatoire (texte de 512 caractères au plus).'
      )
      continue
    }
    if (value.method !== undefined && value.method !== 'POST') {
      report('invalid_url', row.line, '« method » doit être POST.')
      continue
    }
    if (value.url !== undefined && value.url !== endpoint) {
      report(
        'invalid_url',
        row.line,
        `« url » doit être ${endpoint}, comme le point d’accès du lot.`
      )
      continue
    }
    const body = value.body
    if (!isRecordLike(body)) {
      report('invalid_request', row.line, '« body » est obligatoire (objet JSON).')
      continue
    }
    if (typeof body.model !== 'string' || body.model.trim() === '') {
      report('model_required', row.line, '« body.model » est obligatoire.')
      continue
    }
    if (isAgentModel(body.model)) {
      report('invalid_request', row.line, 'un lot appelle un modèle, pas un agent (« agent:… »).')
      continue
    }
    if (body.stream === true) {
      report('invalid_request', row.line, '« stream » n’est pas pris en charge dans un lot.')
      continue
    }
    if (endpoint === '/v1/chat/completions' && !Array.isArray(body.messages)) {
      report('invalid_request', row.line, '« body.messages » est obligatoire (liste de messages).')
      continue
    }
    if (endpoint === '/v1/embeddings' && body.input === undefined) {
      report('invalid_request', row.line, '« body.input » est obligatoire.')
      continue
    }
    const firstLine = seen.get(customId)
    if (firstLine !== undefined) {
      report(
        'duplicate_custom_id',
        row.line,
        `« custom_id » « ${customId} » est déjà utilisé à la ligne ${firstLine}.`
      )
      continue
    }
    seen.set(customId, row.line)
    if (model === null) model = body.model.trim()
    else if (body.model.trim() !== model) {
      report(
        'model_mismatch',
        row.line,
        `le modèle « ${body.model.trim()} » diffère de « ${model} » : un lot n’a qu’un seul modèle.`
      )
      continue
    }
    lines.push({ position: lines.length, customId, body })
  }

  if (errors.length > 0 || model === null) return { ok: false, errors }
  return { ok: true, lines, model }
}

/** The `completion_window` of a batch in hours: `24h` by default, `1h` to `168h`, or `1d` to `7d`. */
export function parseCompletionWindow(
  value: unknown
): { ok: true; hours: number } | { ok: false; message: string } {
  if (value === undefined) return { ok: true, hours: DEFAULT_COMPLETION_HOURS }
  const match = typeof value === 'string' ? /^(\d{1,3})([hd])$/.exec(value) : null
  const hours = match ? Number(match[1]) * (match[2] === 'd' ? 24 : 1) : Number.NaN
  if (!Number.isInteger(hours) || hours < 1 || hours > MAX_COMPLETION_HOURS) {
    return {
      ok: false,
      message: `« completion_window » doit valoir de 1h à ${MAX_COMPLETION_HOURS}h (ou de 1d à 7d) ; 24h par défaut.`,
    }
  }
  return { ok: true, hours }
}

export interface ResultResponse {
  status_code: number
  request_id: string
  body: unknown
}

/** A line of a batch's output file: a request the model answered. */
export function outputLine(item: {
  id: string
  customId: string
  response: ResultResponse
}): string {
  return JSON.stringify({
    id: `batch_req_${item.id}`,
    custom_id: item.customId,
    response: item.response,
    error: null,
  })
}

/** A line of a batch's error file: a request that failed, with the model's answer when it gave one. */
export function errorLine(item: {
  id: string
  customId: string
  response: ResultResponse | null
  error: { code: string; message: string }
}): string {
  return JSON.stringify({
    id: `batch_req_${item.id}`,
    custom_id: item.customId,
    response: item.response,
    error: { code: item.error.code, message: item.error.message },
  })
}
