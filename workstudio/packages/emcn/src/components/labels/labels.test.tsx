/**
 * @vitest-environment jsdom
 */
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChipConfirmModal } from '../chip-modal/chip-modal'
import { EmcnLabelsProvider } from './labels'

vi.mock('next/navigation', () => ({
  usePathname: () => '/workspace/workspace-1/home',
}))

let root: Root | null = null
let container: HTMLDivElement | null = null

function mount(ui: ReactNode) {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root?.render(ui))
}

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
})

function confirmModal(dismissLabel?: string) {
  return (
    <ChipConfirmModal
      open
      onOpenChange={() => {}}
      title='Supprimer'
      confirm={{ label: 'Supprimer', onClick: () => {} }}
      dismissLabel={dismissLabel}
    />
  )
}

function buttonNames(): string[] {
  return [...document.querySelectorAll('button')].map(
    (button) => button.getAttribute('aria-label') ?? button.textContent ?? ''
  )
}

describe('emcn labels', () => {
  it('render the labels an application supplies in place of the English defaults', () => {
    mount(
      <EmcnLabelsProvider labels={{ cancel: 'Annuler', close: 'Fermer' }}>
        {confirmModal()}
      </EmcnLabelsProvider>
    )
    expect(buttonNames()).toEqual(expect.arrayContaining(['Annuler', 'Fermer']))
    expect(buttonNames()).not.toContain('Cancel')
  })

  it('keep the English defaults without a provider', () => {
    mount(confirmModal())
    expect(buttonNames()).toEqual(expect.arrayContaining(['Cancel', 'Close']))
  })

  it('let a label passed by the consumer win over the supplied one', () => {
    mount(
      <EmcnLabelsProvider labels={{ cancel: 'Annuler' }}>
        {confirmModal('Plus tard')}
      </EmcnLabelsProvider>
    )
    expect(buttonNames()).toContain('Plus tard')
    expect(buttonNames()).not.toContain('Annuler')
  })
})
