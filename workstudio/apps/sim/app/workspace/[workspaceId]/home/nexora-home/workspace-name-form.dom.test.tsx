/**
 * @vitest-environment jsdom
 */
import { act } from 'react'
import { authClientMock, authClientMockFns } from '@sim/testing/mocks/auth-client.mock'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  workspaces: [{ id: 'ws-1', name: 'Espace de Essai' }],
  userName: 'Essai SSO' as string | null,
  mutate: vi.fn(),
  isPending: false,
}))

vi.mock('@/lib/auth/client', () => authClientMock)
vi.mock('@/hooks/queries/workspace', () => ({
  useWorkspacesQuery: () => ({ data: state.workspaces }),
  useUpdateWorkspace: () => ({ mutate: state.mutate, isPending: state.isPending }),
}))

import { WorkspaceNameForm } from '@/app/workspace/[workspaceId]/home/nexora-home/workspace-name-form'

let host: HTMLDivElement
let root: Root

const input = () => host.querySelector('input') as HTMLInputElement
const saveButton = () =>
  [...host.querySelectorAll('button')].find((b) => b.textContent?.includes('Rename')) as
    | HTMLButtonElement
    | undefined

function type(value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  act(() => {
    setter?.call(input(), value)
    input().dispatchEvent(new Event('input', { bubbles: true }))
  })
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  state.workspaces = [{ id: 'ws-1', name: 'Espace de Essai' }]
  state.userName = 'Essai SSO'
  authClientMockFns.mockUseSession.mockImplementation(() => ({
    data: { user: { name: state.userName } },
    isPending: false,
    error: null,
  }))
  state.mutate.mockReset()
  state.isPending = false
  act(() => root.render(<WorkspaceNameForm workspaceId='ws-1' />))
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('workspace name form', () => {
  it('offers the well-formed name in place of the badly elided one, and renames with one click', () => {
    expect(input().value).toBe('Espace d’Essai')
    act(() => saveButton()?.click())
    expect(state.mutate).toHaveBeenCalledTimes(1)
    expect(state.mutate.mock.calls[0][0]).toEqual({ workspaceId: 'ws-1', name: 'Espace d’Essai' })
  })

  it('renames to what the person typed, trimmed', () => {
    type('  Boulangerie Gagnon ')
    act(() => saveButton()?.click())
    expect(state.mutate.mock.calls[0][0]).toEqual({
      workspaceId: 'ws-1',
      name: 'Boulangerie Gagnon',
    })
  })

  it('has nothing to rename while the field holds the current name or nothing', () => {
    act(() => root.render(<WorkspaceNameForm workspaceId='ws-1' />))
    type('Espace de Essai')
    expect(saveButton()?.disabled).toBe(true)
    type('   ')
    expect(saveButton()?.disabled).toBe(true)
  })

  it('shows the name the rename gave, not the proposal, once the workspace list answers', () => {
    state.workspaces = [{ id: 'ws-1', name: 'Boulangerie Gagnon' }]
    act(() => root.render(<WorkspaceNameForm workspaceId='ws-1' />))
    expect(input().value).toBe('Boulangerie Gagnon')
    expect(saveButton()?.disabled).toBe(true)
  })

  it('renders nothing before the workspace list is known', () => {
    state.workspaces = []
    act(() => root.render(<WorkspaceNameForm workspaceId='ws-1' />))
    expect(host.innerHTML).toBe('')
  })
})
