import { describe, expect, it } from 'vitest'
import { AUDIT_LOG_CSV_HEADER } from '@/lib/audit-logs/csv'
import { auditCsvFormat, formatAuditCsvCell } from '@/lib/nexora/audit-csv'

const row = {
  id: 'evt-1',
  workspaceId: 'ws-1',
  actorId: 'u-1',
  action: 'organization.budgets.updated',
  resourceType: 'organization',
  resourceId: 'org-1',
  actorName: 'Marie Dupont',
  actorEmail: 'marie@exemple.fr',
  resourceName: null,
  description: 'Updated monthly token budgets',
  metadata: { change: { alertThreshold: 0.8 } },
  ipAddress: '10.0.0.4',
  userAgent: 'Mozilla/5.0',
  surface: 'web',
  createdAt: new Date('2026-10-25T13:03:12Z'),
}

const french = auditCsvFormat('fr', 'Europe/Paris')

describe('auditCsvFormat — français', () => {
  it('écrit des en-têtes français séparés par des points-virgules', () => {
    expect(french.header.split(';')).toEqual([
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
    ])
  })

  it('donne la date à l’heure de l’instance, jj/mm/aaaa hh:mm:ss, que Excel et LibreOffice lisent comme une date', () => {
    const cells = french.row(row, 10_000)?.split(';')
    expect(cells?.[0]).toBe('25/10/2026 14:03:12')
    expect(auditCsvFormat('fr', 'UTC').row(row, 10_000)?.split(';')[0]).toBe('25/10/2026 13:03:12')
  })

  it('traduit l’action et garde son code, avec un détail lisible', () => {
    const cells = french.row(row, 10_000)?.split(';')
    expect(cells?.slice(1, 4)).toEqual([
      'Budgets mensuels modifiés',
      'organization.budgets.updated',
      'Budgets mensuels modifiés',
    ])
    expect(cells?.[5]).toBe('marie@exemple.fr')
  })

  it('garde le code d’une action sans libellé', () => {
    const cells = french.row({ ...row, action: 'quelque.chose.de.nouveau' }, 10_000)?.split(';')
    expect(cells?.[1]).toBe('quelque.chose.de.nouveau')
  })

  it('met entre guillemets ce qui contient un point-virgule, un guillemet ou un retour à la ligne', () => {
    const line = french.row({ ...row, description: 'a;b "c"\nd', userAgent: 'x' }, 10_000) as string
    expect(line).toContain('"a;b ""c""\nd"')
    expect(line).toContain('"{""change"":{""alertThreshold"":0.8}}"')
  })

  it('empêche un tableur d’exécuter ce qu’une personne a écrit', () => {
    const line = french.row(
      { ...row, actorEmail: null, actorName: '=HYPERLINK("http://x")', resourceName: '+33 1' },
      10_000
    ) as string
    expect(line).toContain(`"'=HYPERLINK(""http://x"")"`)
    expect(formatAuditCsvCell('@SOMME(A1)')).toBe("'@SOMME(A1)")
    expect(formatAuditCsvCell('-5 €')).toBe("'-5 €")
  })

  it('écrit les nombres avec la virgule décimale, sans séparateur de milliers', () => {
    expect(formatAuditCsvCell(1234.5)).toBe('1234,5')
    expect(formatAuditCsvCell(0.8)).toBe('0,8')
    expect(formatAuditCsvCell(1_000_000)).toBe('1000000')
    expect(formatAuditCsvCell(null)).toBe('')
  })

  it('refuse une ligne plus grosse que ce qui reste du budget', () => {
    expect(french.row(row, 20)).toBeUndefined()
  })

  it('commence par la marque d’ordre des octets et sépare les lignes par CRLF', () => {
    const file = french.join([french.header, french.row(row, 10_000) as string])
    expect(file.startsWith('﻿Date;Action;')).toBe(true)
    expect(file.split('\r\n')).toHaveLength(2)
  })

  it('compte le séparateur et la marque dans la taille de l’en-tête', () => {
    expect(french.headerBytes).toBe(Buffer.byteLength(french.header, 'utf8'))
  })
})

describe('auditCsvFormat — anglais', () => {
  it('garde le fichier d’origine : virgules, dates ISO, fins de ligne simples', () => {
    const english = auditCsvFormat('en', 'Europe/Paris')
    expect(english.header).toBe(AUDIT_LOG_CSV_HEADER)
    expect(
      english.row(row, 10_000)?.startsWith('2026-10-25T13:03:12.000Z,organization.budgets.updated,')
    ).toBe(true)
    expect(english.join(['a', 'b'])).toBe('a\nb')
  })
})
