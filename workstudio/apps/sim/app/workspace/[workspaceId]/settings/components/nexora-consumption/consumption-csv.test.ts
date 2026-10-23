import { describe, expect, it } from 'vitest'
import {
  buildConsumptionCsv,
  type ConsumptionCsvLabels,
  type ConsumptionCsvReport,
} from '@/app/workspace/[workspaceId]/settings/components/nexora-consumption/consumption-csv'

const labels: ConsumptionCsvLabels = {
  columns: ['Rubrique', 'Libellé', 'Exécutions', 'Requêtes', 'Jetons', 'kWh', 'kgCO2eq', 'Note'],
  sections: { day: 'Jour', model: 'Modèle', workspace: 'Espace', person: 'Personne' },
  deletedWorkspace: 'Espace supprimé',
  estimate: 'estimation',
}

const report: ConsumptionCsvReport = {
  days: [{ date: '2026-10-23', executions: 7, totalTokens: 1_234_567 }],
  models: [
    {
      model: 'mistral-small',
      requests: 40,
      totalTokens: 10_000,
      kWh: 0.5,
      kgCO2eq: 0.0000001,
    },
  ],
  workspaces: [
    {
      workspaceId: 'ws-1',
      name: 'Ventes; "Nord"',
      executions: 3,
      totalTokens: 900,
      footprint: { kgCO2eq: 0.00772 },
    },
    { workspaceId: null, name: null, executions: 1, totalTokens: 100, footprint: null },
  ],
  users: [
    {
      userId: 'user-1',
      name: '=HYPERLINK("http://x")',
      email: 'a@pme.fr',
      executions: 2,
      totalTokens: 50,
      footprint: null,
    },
    { userId: 'user-2', name: null, email: null, executions: 0, totalTokens: 0, footprint: null },
  ],
}

function lines(csv: string): string[] {
  return csv.replace(/^﻿/, '').split('\r\n')
}

describe('buildConsumptionCsv', () => {
  it('opens with a byte-order mark so a spreadsheet reads the accents as UTF-8', () => {
    const csv = buildConsumptionCsv(report, labels)
    expect(csv.startsWith('﻿')).toBe(true)
    expect(lines(csv)[0]).toBe('Rubrique;Libellé;Exécutions;Requêtes;Jetons;kWh;kgCO2eq;Note')
  })

  it('writes numbers the French way: decimal comma, no grouping, never an exponent', () => {
    const [, day, model] = lines(buildConsumptionCsv(report, labels))
    expect(day).toBe('Jour;2026-10-23;7;;1234567;;;')
    expect(model).toBe('Modèle;mistral-small;;40;10000;0,5;0,0000001;')
  })

  it('quotes a name holding the separator or quotes, so it stays in one cell', () => {
    const workspace = lines(buildConsumptionCsv(report, labels))[3]
    expect(workspace).toBe('Espace;"Ventes; ""Nord""";3;;900;;0,00772;estimation')
  })

  it('neutralises a name a spreadsheet would run as a formula', () => {
    const person = lines(buildConsumptionCsv(report, labels))[5]
    expect(person.split(';')[1]).toBe('"\'=HYPERLINK(""http://x"")"')
  })

  it('names deleted workspaces and anonymous people, and leaves unknown figures empty', () => {
    const rows = lines(buildConsumptionCsv(report, labels))
    expect(rows[4]).toBe('Espace;Espace supprimé;1;;100;;;')
    expect(rows[6]).toBe('Personne;user-2;0;;0;;;')
  })

  it('leaves the model rows out when Nexora API could not be read', () => {
    const rows = lines(buildConsumptionCsv({ ...report, models: null }, labels))
    expect(rows.some((row) => row.startsWith('Modèle;'))).toBe(false)
    expect(rows).toHaveLength(6)
  })
})
