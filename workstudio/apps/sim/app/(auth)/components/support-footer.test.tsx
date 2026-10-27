/**
 * @vitest-environment jsdom
 */
import { act } from 'react'
import { resetEnvMock, setEnv } from '@sim/testing/mocks/env.mock'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SupportFooter } from '@/app/(auth)/components/support-footer'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  resetEnvMock()
})

describe('SupportFooter', () => {
  it('shows nothing until the operator gives a contact address (no placeholder address on public pages)', () => {
    act(() => root.render(<SupportFooter />))
    expect(host.innerHTML).toBe('')
    expect(host.textContent).not.toContain('example.com')
  })

  it('links the operator contact address when one is configured', () => {
    setEnv({ NEXT_PUBLIC_SUPPORT_EMAIL: 'aide@exemple.fr' })
    act(() => root.render(<SupportFooter />))
    expect(host.querySelector('a')?.getAttribute('href')).toBe('mailto:aide@exemple.fr')
  })
})
