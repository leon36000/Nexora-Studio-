import { describe, expect, it } from 'vitest'
import { defaultWorkspaceName } from '@/lib/nexora/workspace-name'

describe('defaultWorkspaceName', () => {
  it('names a person’s first workspace in French, by their first name', () => {
    expect(defaultWorkspaceName('Camille Martin')).toBe('Espace de Camille')
    expect(defaultWorkspaceName('  ')).toBe('Mon espace')
    expect(defaultWorkspaceName(null)).toBe('Mon espace')
  })
})
