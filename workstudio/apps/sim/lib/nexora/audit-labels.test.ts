import { AuditAction } from '@sim/audit'
import { describe, expect, it } from 'vitest'
import { type AuditTranslator, describeAuditEntry } from '@/lib/nexora/audit-labels'
import frGovernance from '@/messages/fr/governance.json'

const french: Record<string, string> = {
  'actions.workspace.created': 'Espace créé',
  'actions.organization.sso_policy.updated': 'Politique SSO modifiée',
}
const t: AuditTranslator = Object.assign((key: string) => french[key] ?? key, {
  has: (key: string) => key in french,
})

describe('describeAuditEntry', () => {
  it('shows the French label of a known action and the resource it concerns', () => {
    expect(
      describeAuditEntry(
        {
          action: 'workspace.created',
          description: 'Created workspace "Fumée"',
          resourceName: 'Fumée',
        },
        t
      )
    ).toEqual({ label: 'Espace créé', detail: 'Fumée' })
    expect(
      describeAuditEntry(
        {
          action: 'organization.sso_policy.updated',
          description: 'Transferred ownership to bob@pme.fr',
          resourceName: null,
        },
        t
      )
    ).toEqual({ label: 'Politique SSO modifiée', detail: 'bob@pme.fr' })
  })

  it('never shows the English description: only the names and addresses it quotes', () => {
    const detail = (description: string | null) =>
      describeAuditEntry({ action: 'workspace.created', description, resourceName: null }, t).detail
    expect(detail('Renamed workspace "Ventes" to "Ventes 2026"')).toBe('Ventes, Ventes 2026')
    expect(detail('Invited ana@pme.fr and bob@pme.fr as admin')).toBe('ana@pme.fr, bob@pme.fr')
    expect(detail('Rotated the signing key')).toBe('—')
    expect(detail(null)).toBe('—')
  })

  it('falls back to the code for an unknown action, still without English', () => {
    expect(
      describeAuditEntry({ action: 'brand.new', description: 'Did a thing', resourceName: 'X' }, t)
    ).toEqual({ label: 'brand.new', detail: 'X' })
  })

  it('gives every audit action a French label', () => {
    const labelled = new Set<string>()
    const walk = (node: unknown, path: string[]) => {
      if (typeof node === 'string') labelled.add(path.join('.'))
      else if (node && typeof node === 'object')
        for (const [k, v] of Object.entries(node)) walk(v, [...path, k])
    }
    walk(frGovernance.auditLogs.actions, [])
    expect(Object.values(AuditAction).filter((action) => !labelled.has(action))).toEqual([])
  })
})
