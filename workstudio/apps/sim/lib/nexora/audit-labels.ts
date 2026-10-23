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

/**
 * Nexora edition: audit entries store an English description written at the time of the
 * event. The log shows instead the French label of the action (`actions.<action>`) and the
 * name of the resource it concerns (the stored description when there is none); an action
 * without a label keeps its code and description.
 */
export function describeAuditEntry(
  entry: AuditEntryText,
  t: AuditTranslator
): { label: string; detail: string } {
  const key = `actions.${entry.action}`
  if (!t.has(key)) return { label: entry.action, detail: entry.description ?? '' }
  return { label: t(key), detail: entry.resourceName || entry.description || '' }
}
