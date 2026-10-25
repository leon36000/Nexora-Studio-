import { describe, expect, it } from 'vitest'
import { viewDisplayName } from '@/lib/table/views/display-name'

describe('viewDisplayName', () => {
  it('reads a starter view seeded in English in the viewer language', () => {
    expect(viewDisplayName({ name: 'Default', isDefault: true }, 'Par défaut')).toBe('Par défaut')
  })

  it('reads a starter view seeded in French in the viewer language', () => {
    expect(viewDisplayName({ name: 'Par défaut', isDefault: true }, 'Default')).toBe('Default')
  })

  it('shows a name the member chose as typed', () => {
    expect(viewDisplayName({ name: 'Clients actifs', isDefault: true }, 'Par défaut')).toBe(
      'Clients actifs'
    )
  })

  it('shows another view called « Default » as typed', () => {
    expect(viewDisplayName({ name: 'Default', isDefault: false }, 'Par défaut')).toBe('Default')
  })
})
