import { describe, expect, it } from 'vitest'
import { type AuditTranslator, describeAuditEntry } from '@/lib/nexora/audit-labels'

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
    ).toEqual({ label: 'Politique SSO modifiée', detail: 'Transferred ownership to bob@pme.fr' })
  })

  it('falls back to the code and the stored description for an unknown action', () => {
    expect(
      describeAuditEntry({ action: 'brand.new', description: 'Did a thing', resourceName: 'X' }, t)
    ).toEqual({ label: 'brand.new', detail: 'Did a thing' })
  })
})
