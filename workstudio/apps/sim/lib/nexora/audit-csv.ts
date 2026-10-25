import { createTranslator } from 'next-intl'
import { AUDIT_LOG_CSV_HEADER, toAuditLogCsvRow } from '@/lib/audit-logs/csv'
import type { queryAuditLogs } from '@/lib/audit-logs/query'
import { neutralizeCsvFormula } from '@/lib/core/utils/csv'
import type { Locale } from '@/lib/i18n/config'
import { type AuditTranslator, describeAuditEntry } from '@/lib/nexora/audit-labels'
import frGovernance from '@/messages/fr/governance.json'

type AuditRow = Awaited<ReturnType<typeof queryAuditLogs>>['data'][number]

/** How a spreadsheet is told a file is UTF-8, so accents survive a double-click in Excel. */
const BOM = '﻿'
const SEPARATOR = ';'
const LINE_END = '\r\n'
const NUMBER_FORMAT = new Intl.NumberFormat('fr-FR', {
  useGrouping: false,
  maximumFractionDigits: 9,
})

const FRENCH_HEADERS = [
  'Date',
  'Action',
  'Code de l’action',
  'Détail',
  'Type de ressource',
  'Auteur',
  'Identifiant de l’espace',
  'Identifiant de la ressource',
  'Identifiant de l’auteur',
  'Adresse IP',
  'Navigateur',
  'Origine',
  'Identifiant de l’événement',
  'Métadonnées',
  'Description d’origine (anglais)',
] as const

/**
 * One cell for a French spreadsheet: numbers with a decimal comma and no thousands separator,
 * objects as JSON, text that a spreadsheet would run as a formula kept as text, and anything with
 * a `;`, a quote or a line break between quotes.
 */
export function formatAuditCsvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const text =
    typeof value === 'number'
      ? NUMBER_FORMAT.format(value)
      : typeof value === 'string'
        ? neutralizeCsvFormula(value)
        : (JSON.stringify(value) ?? '')
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/** `25/10/2026 14:03:12` in the instance time zone: a date every French spreadsheet reads as one. */
function frenchDate(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? ''
  return `${part('day')}/${part('month')}/${part('year')} ${part('hour')}:${part('minute')}:${part('second')}`
}

let frenchTranslator: AuditTranslator | undefined

function auditTranslator(): AuditTranslator {
  frenchTranslator ??= createTranslator({
    locale: 'fr',
    messages: { auditLogs: frGovernance.auditLogs },
    namespace: 'auditLogs',
  }) as unknown as AuditTranslator
  return frenchTranslator
}

export interface AuditCsvFormat {
  header: string
  headerBytes: number
  /** One entry as a line, or `undefined` when it is larger than `maxBytes`. */
  row: (row: AuditRow, maxBytes: number) => string | undefined
  join: (lines: readonly string[]) => string
}

/**
 * The audit export in the language of the request. French: `;` separators, French headers and
 * action labels, `jj/mm/aaaa hh:mm:ss` dates, a byte-order mark and CRLF line ends, so a double
 * click opens it in Excel or LibreOffice in French. Any other language keeps the original file.
 */
export function auditCsvFormat(locale: Locale, timeZone: string): AuditCsvFormat {
  if (locale !== 'fr') {
    return {
      header: AUDIT_LOG_CSV_HEADER,
      headerBytes: Buffer.byteLength(AUDIT_LOG_CSV_HEADER, 'utf8'),
      row: toAuditLogCsvRow,
      join: (lines) => lines.join('\n'),
    }
  }
  const header = FRENCH_HEADERS.map(formatAuditCsvCell).join(SEPARATOR)
  return {
    header,
    headerBytes: Buffer.byteLength(header, 'utf8'),
    row(row, maxBytes) {
      const { label, detail } = describeAuditEntry(
        { action: row.action, description: row.description, resourceName: row.resourceName },
        auditTranslator()
      )
      const line = [
        frenchDate(row.createdAt, timeZone),
        label,
        row.action,
        detail,
        row.resourceType,
        row.actorEmail || row.actorName || 'Système',
        row.workspaceId,
        row.resourceId,
        row.actorId,
        row.ipAddress,
        row.userAgent,
        row.surface,
        row.id,
        row.metadata,
        row.description,
      ]
        .map(formatAuditCsvCell)
        .join(SEPARATOR)
      return Buffer.byteLength(line, 'utf8') > maxBytes ? undefined : line
    },
    join: (lines) => BOM + lines.join(LINE_END),
  }
}
