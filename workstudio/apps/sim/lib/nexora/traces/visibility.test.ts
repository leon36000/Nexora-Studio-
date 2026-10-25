/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import { canReadTrace, type TraceViewer } from '@/lib/nexora/traces/visibility'

const member = (over: Partial<TraceViewer> = {}): TraceViewer => ({
  userId: 'bob',
  isInstanceAdmin: false,
  workspacePermission: 'write',
  ...over,
})

const privateOfAlice = { visibility: 'private' as const, userId: 'alice', workspaceId: 'ws-1' }
const shared = { visibility: 'workspace' as const, userId: 'alice', workspaceId: 'ws-1' }

describe('canReadTrace', () => {
  it('une trace d’espace se lit de tout membre, lecture seule comprise', () => {
    expect(canReadTrace(member({ workspacePermission: 'read' }), shared)).toBe(true)
  })

  it('une trace privée se lit de son auteur', () => {
    expect(canReadTrace(member({ userId: 'alice' }), privateOfAlice)).toBe(true)
  })

  it('une trace privée ne se lit pas d’un autre membre, même en écriture', () => {
    expect(canReadTrace(member(), privateOfAlice)).toBe(false)
    expect(canReadTrace(member({ workspacePermission: 'read' }), privateOfAlice)).toBe(false)
  })

  it('une trace privée se lit d’un administrateur de l’espace', () => {
    expect(canReadTrace(member({ workspacePermission: 'admin' }), privateOfAlice)).toBe(true)
  })

  it('un administrateur d’instance qui n’est pas membre de l’espace ne lit rien de cet espace', () => {
    const outsider = member({ workspacePermission: null, isInstanceAdmin: true })
    expect(canReadTrace(outsider, shared)).toBe(false)
    expect(canReadTrace(outsider, privateOfAlice)).toBe(false)
  })

  it('un non-membre ne lit rien', () => {
    expect(canReadTrace(member({ workspacePermission: null }), shared)).toBe(false)
  })

  it('une trace sans espace (clé d’instance) ne se lit que d’un administrateur d’instance', () => {
    const trace = { visibility: 'workspace' as const, userId: null, workspaceId: null }
    expect(canReadTrace(member({ isInstanceAdmin: true, workspacePermission: null }), trace)).toBe(
      true
    )
    expect(canReadTrace(member(), trace)).toBe(false)
  })

  it('une trace privée dont l’auteur a disparu ne se lit que d’un administrateur de l’espace', () => {
    const orphan = { visibility: 'private' as const, userId: null, workspaceId: 'ws-1' }
    expect(canReadTrace(member(), orphan)).toBe(false)
    expect(canReadTrace(member({ workspacePermission: 'admin' }), orphan)).toBe(true)
  })
})
