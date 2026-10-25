import { describe, expect, it } from 'vitest'
import {
  draftFromOverview,
  policyChange,
  samePolicyDraft,
} from '@/app/workspace/[workspaceId]/settings/components/nexora-data-protection/policy-draft'

const overview = {
  policy: { defaultMode: 'mask' as const, workspaceModes: { 'ws-compta': 'refuse' as const } },
  workspaces: [
    { id: 'ws-compta', name: 'Comptabilité', status: 'active' as const },
    { id: 'ws-ventes', name: 'Ventes', status: 'active' as const },
  ],
  service: { configured: true, reachable: true },
}

describe('draftFromOverview', () => {
  it('gives each workspace its own mode, or « inherit » when it follows the instance', () => {
    expect(draftFromOverview(overview)).toEqual({
      defaultMode: 'mask',
      choices: { 'ws-compta': 'refuse', 'ws-ventes': 'inherit' },
    })
  })
})

describe('policyChange', () => {
  const initial = draftFromOverview(overview)

  it('is nothing when nothing was touched', () => {
    expect(samePolicyDraft(initial, structuredClone(initial))).toBe(true)
    expect(policyChange(initial, structuredClone(initial))).toBeNull()
  })

  it('sends only what changed, a workspace back to the default as null', () => {
    const draft = {
      defaultMode: 'refuse' as const,
      choices: { 'ws-compta': 'inherit' as const, 'ws-ventes': 'allow' as const },
    }
    expect(samePolicyDraft(initial, draft)).toBe(false)
    expect(policyChange(initial, draft)).toEqual({
      defaultMode: 'refuse',
      workspaceModes: { 'ws-compta': null, 'ws-ventes': 'allow' },
    })
  })

  it('leaves the default out when only a workspace changed', () => {
    const draft = { ...initial, choices: { ...initial.choices, 'ws-ventes': 'mask' as const } }
    expect(policyChange(initial, draft)).toEqual({ workspaceModes: { 'ws-ventes': 'mask' } })
  })
})
