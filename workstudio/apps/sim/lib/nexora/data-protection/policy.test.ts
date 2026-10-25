import { describe, expect, it } from 'vitest'
import {
  applyDataProtectionChange,
  type DataProtectionPolicy,
  parseDataProtection,
  resolveMode,
} from '@/lib/nexora/data-protection/policy'

const open: DataProtectionPolicy = { defaultMode: 'allow', workspaceModes: {} }

describe('parseDataProtection', () => {
  it('lets personal data through when nothing is stored', () => {
    expect(parseDataProtection(undefined)).toEqual(open)
    expect(parseDataProtection({ nexoraBudgets: { instanceMonthlyTokens: 5 } })).toEqual(open)
  })

  it('reads what is stored and ignores what it does not understand', () => {
    const metadata = {
      nexoraDataProtection: {
        defaultMode: 'mask',
        workspaceModes: {
          'ws-compta': 'refuse',
          'ws-ventes': 'allow',
          'ws-x': 'banana',
          'ws-y': 7,
        },
      },
    }
    expect(parseDataProtection(metadata)).toEqual({
      defaultMode: 'mask',
      workspaceModes: { 'ws-compta': 'refuse', 'ws-ventes': 'allow' },
    })
  })

  it('falls back to allow, not to a stricter or looser guess, on a malformed value', () => {
    expect(parseDataProtection({ nexoraDataProtection: 'mask' })).toEqual(open)
    expect(
      parseDataProtection({ nexoraDataProtection: { defaultMode: 42, workspaceModes: [] } })
    ).toEqual(open)
    expect(parseDataProtection({ nexoraDataProtection: ['mask'] })).toEqual(open)
  })
})

describe('resolveMode', () => {
  const policy: DataProtectionPolicy = {
    defaultMode: 'mask',
    workspaceModes: { 'ws-compta': 'refuse', 'ws-labo': 'allow' },
  }

  it('uses the workspace own mode, loosening or tightening the instance default', () => {
    expect(resolveMode(policy, 'ws-compta')).toBe('refuse')
    expect(resolveMode(policy, 'ws-labo')).toBe('allow')
  })

  it('follows the instance default for a workspace without a mode and for a call without workspace', () => {
    expect(resolveMode(policy, 'ws-ventes')).toBe('mask')
    expect(resolveMode(policy, null)).toBe('mask')
  })

  it('does not read inherited object keys as a workspace mode', () => {
    expect(resolveMode(policy, 'constructor')).toBe('mask')
    expect(resolveMode(policy, '__proto__')).toBe('mask')
  })
})

describe('applyDataProtectionChange', () => {
  it('changes the default and one workspace without touching the others', () => {
    const policy = { defaultMode: 'allow', workspaceModes: { a: 'mask', b: 'refuse' } } as const
    expect(
      applyDataProtectionChange(policy, { defaultMode: 'mask', workspaceModes: { a: 'refuse' } })
    ).toEqual({
      defaultMode: 'mask',
      workspaceModes: { a: 'refuse', b: 'refuse' },
    })
  })

  it('removes a workspace mode with null, so it follows the default again', () => {
    const policy = { defaultMode: 'mask', workspaceModes: { a: 'refuse' } } as const
    expect(applyDataProtectionChange(policy, { workspaceModes: { a: null } })).toEqual({
      defaultMode: 'mask',
      workspaceModes: {},
    })
  })

  it('keeps the default when the change does not name it', () => {
    const policy = { defaultMode: 'refuse', workspaceModes: {} } as const
    expect(applyDataProtectionChange(policy, { workspaceModes: { a: 'mask' } }).defaultMode).toBe(
      'refuse'
    )
  })
})
