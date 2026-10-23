/** A next-intl translator scoped to `governance.auditLogs`. */
export interface AuditTranslator {
  (key: string): string
  has(key: string): boolean
}

interface AuditEntryText {
  action: string
  description: string | null
  resourceName: string | null
}

/** What a stored English description quotes: `"names"` and e-mail addresses, in order. */
const QUOTED_VALUE = /"([^"]+)"|([^\s"'(),;<>]+@[^\s"'(),;<>]+\.[a-z]{2,})/gi

/**
 * Nexora edition: audit entries store an English description written at the time of the
 * event. The log shows instead the French label of the action (`actions.<action>`) and, as the
 * detail, the name of the resource it concerns — or, when the entry names none, the names and
 * addresses its description quotes (`Transferred ownership to bob@pme.fr` ⇒ `bob@pme.fr`), never
 * the English sentence itself; the CSV export keeps the stored description. An action without a
 * label keeps its code.
 */
export function describeAuditEntry(
  entry: AuditEntryText,
  t: AuditTranslator
): { label: string; detail: string } {
  const key = `actions.${entry.action}`
  const label = t.has(key) ? t(key) : entry.action
  if (entry.resourceName) return { label, detail: entry.resourceName }
  const quoted = [...(entry.description ?? '').matchAll(QUOTED_VALUE)].map(
    (match) => match[1] ?? match[2]
  )
  return { label, detail: quoted.length > 0 ? quoted.join(', ') : '—' }
}
