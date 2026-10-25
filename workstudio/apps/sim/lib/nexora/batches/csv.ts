import { isRecordLike } from '@sim/utils/object'
import type { ResultRow } from '@/lib/nexora/batches/repository'

/** French spreadsheets read `;` as the separator and need the byte order mark to open UTF-8. */
const SEPARATOR = ';'
const LINE_BREAK = '\r\n'
const BOM = '﻿'
const HEADER = ['ligne', 'identifiant', 'entrée', 'résultat', 'statut', 'erreur', 'durée_ms']
const PAGE = 200

/** One CSV cell: quoted when it needs it, and a leading `=`, `+`, `-`, `@` or tab defused (formula injection). */
export function csvCell(value: string | number | null): string {
  if (value === null) return ''
  let text = String(value)
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[";\r\n]/.test(text) || text !== String(value) ? `"${text.replaceAll('"', '""')}"` : text
}

/** What answered a row: the text written in the table, or the assistant message of a chat completion. */
export function answerOf(row: ResultRow): string {
  if (row.answer) return row.answer
  const body = row.response?.body
  if (!isRecordLike(body) || !Array.isArray(body.choices)) return ''
  const message = isRecordLike(body.choices[0]) ? body.choices[0].message : null
  return isRecordLike(message) && typeof message.content === 'string' ? message.content : ''
}

const STATUS_LABEL: Record<string, string> = {
  done: 'Terminé',
  error: 'Erreur',
  pending: 'En attente',
  running: 'En cours',
}

export function resultCsvRow(row: ResultRow): string {
  return [
    row.position + 1,
    row.customId,
    row.inputText,
    answerOf(row),
    STATUS_LABEL[row.status] ?? row.status,
    row.error?.message ?? '',
    row.latencyMs,
  ]
    .map((cell) => csvCell(cell))
    .join(SEPARATOR)
}

/**
 * The CSV of a batch's results, read page by page so that a batch of ten thousand rows never sits
 * in memory: a byte order mark, the header, then one line per row in file order.
 */
export function batchCsvStream(
  listPage: (afterPosition: number, limit: number) => Promise<ResultRow[]>,
  pageSize = PAGE
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let after = -1
  let started = false
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (!started) {
        started = true
        controller.enqueue(encoder.encode(`${BOM}${HEADER.join(SEPARATOR)}${LINE_BREAK}`))
        return
      }
      const rows = await listPage(after, pageSize)
      if (rows.length === 0) {
        controller.close()
        return
      }
      after = rows[rows.length - 1].position
      controller.enqueue(
        encoder.encode(`${rows.map((row) => resultCsvRow(row)).join(LINE_BREAK)}${LINE_BREAK}`)
      )
    },
  })
}
