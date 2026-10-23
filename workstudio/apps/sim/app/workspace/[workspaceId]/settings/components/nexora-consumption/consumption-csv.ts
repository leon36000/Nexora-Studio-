/** The part of the consumption report the CSV export reads. */
export interface ConsumptionCsvReport {
  days: ReadonlyArray<{ date: string; executions: number; totalTokens: number }>
  models: ReadonlyArray<{
    model: string
    requests: number
    totalTokens: number
    kWh: number
    kgCO2eq: number
  }> | null
  workspaces: ReadonlyArray<{
    workspaceId: string | null
    name: string | null
    executions: number
    totalTokens: number
    footprint: { kgCO2eq: number } | null
  }>
  users: ReadonlyArray<{
    userId: string
    name: string | null
    email: string | null
    executions: number
    totalTokens: number
    footprint: { kgCO2eq: number } | null
  }>
}

export interface ConsumptionCsvLabels {
  /** Section, label, executions, requests, tokens, kWh, kgCO2eq, note. */
  columns: readonly [string, string, string, string, string, string, string, string]
  sections: { day: string; model: string; workspace: string; person: string }
  deletedWorkspace: string
  /** Note of a row whose footprint is estimated. */
  estimate: string
}

type Cell = string | number | null

const SEPARATOR = ';'
const LINE_END = '\r\n'
/** A cell a spreadsheet would evaluate as a formula starts with one of these. */
const FORMULA_LEAD = /^[=+\-@\t\r]/
const NUMBER_FORMAT = new Intl.NumberFormat('fr-FR', {
  useGrouping: false,
  maximumFractionDigits: 9,
})

function cell(value: Cell): string {
  if (value === null) return ''
  if (typeof value === 'number') return NUMBER_FORMAT.format(value)
  const text = FORMULA_LEAD.test(value) ? `'${value}` : value
  return /[;"\r\n]/.test(text) || text !== text.trim() || text.startsWith("'")
    ? `"${text.replace(/"/g, '""')}"`
    : text
}

/**
 * The loaded consumption report as one CSV file for a French spreadsheet: `;` separators,
 * decimal commas, a byte-order mark for the accents, one row per day, model, workspace and
 * person. Names are user-supplied, so a name that would run as a formula is kept as text.
 */
export function buildConsumptionCsv(
  report: ConsumptionCsvReport,
  labels: ConsumptionCsvLabels
): string {
  const rows: Cell[][] = [[...labels.columns]]
  for (const day of report.days) {
    rows.push([
      labels.sections.day,
      day.date,
      day.executions,
      null,
      day.totalTokens,
      null,
      null,
      null,
    ])
  }
  for (const model of report.models ?? []) {
    rows.push([
      labels.sections.model,
      model.model,
      null,
      model.requests,
      model.totalTokens,
      model.kWh,
      model.kgCO2eq,
      null,
    ])
  }
  for (const workspace of report.workspaces) {
    rows.push([
      labels.sections.workspace,
      workspace.workspaceId ? (workspace.name ?? workspace.workspaceId) : labels.deletedWorkspace,
      workspace.executions,
      null,
      workspace.totalTokens,
      null,
      workspace.footprint?.kgCO2eq ?? null,
      workspace.footprint ? labels.estimate : null,
    ])
  }
  for (const person of report.users) {
    rows.push([
      labels.sections.person,
      person.name || person.email || person.userId,
      person.executions,
      null,
      person.totalTokens,
      null,
      person.footprint?.kgCO2eq ?? null,
      person.footprint ? labels.estimate : null,
    ])
  }
  return `﻿${rows.map((row) => row.map(cell).join(SEPARATOR)).join(LINE_END)}`
}
