/**
 * @vitest-environment jsdom
 */
import { act } from 'react'
import { resetEnvMock, setEnv } from '@sim/testing/mocks/env.mock'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AuthLegalFooter } from '@/app/(auth)/components/auth-legal-footer'

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

function renderFooter(action: 'signingIn' | 'creatingAccount') {
  act(() => root.render(<AuthLegalFooter action={action} />))
}

const hrefs = () => [...host.querySelectorAll('a')].map((a) => a.getAttribute('href'))

describe('AuthLegalFooter', () => {
  it('shows nothing when the operator published no legal pages (the links would bounce back to the sign-in page)', () => {
    renderFooter('signingIn')
    expect(host.innerHTML).toBe('')
  })

  it("links the operator's own terms and privacy pages when configured", () => {
    setEnv({
      NEXT_PUBLIC_TERMS_URL: 'https://exemple.fr/cgu',
      NEXT_PUBLIC_PRIVACY_URL: 'https://exemple.fr/confidentialite',
    })
    renderFooter('creatingAccount')
    expect(hrefs()).toEqual(['https://exemple.fr/cgu', 'https://exemple.fr/confidentialite'])
  })

  it('ignores an address that is not http(s)', () => {
    setEnv({
      NEXT_PUBLIC_TERMS_URL: 'javascript:alert(1)',
      NEXT_PUBLIC_PRIVACY_URL: 'https://exemple.fr/p',
    })
    renderFooter('signingIn')
    expect(host.innerHTML).toBe('')
  })
})
