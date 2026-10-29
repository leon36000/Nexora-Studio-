/**
 * @vitest-environment jsdom
 */
import { act } from 'react'
import { resetEnvMock, setEnv } from '@sim/testing/mocks/env.mock'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const searchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => searchParams,
  usePathname: () => '/login',
}))
vi.mock('@/lib/auth/client', () => ({
  client: { signIn: { email: vi.fn(), social: vi.fn() } },
}))
vi.mock('@/hooks/use-capture-when-ready', () => ({ useCaptureWhenReady: vi.fn() }))

import LoginPage from '@/app/(auth)/login/login-form'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  setEnv({ NEXT_PUBLIC_NEXORA_OIDC_NAME: 'Nexora AI' })
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  resetEnvMock()
  for (const key of [...searchParams.keys()]) searchParams.delete(key)
})

function render(props: { ssoFirst: boolean; siteSignupUrl: string | null }) {
  act(() =>
    root.render(
      <LoginPage
        githubAvailable={false}
        googleAvailable={false}
        microsoftAvailable={false}
        registrationDisabled={false}
        {...props}
      />
    )
  )
}

const buttonLabels = () => [...host.querySelectorAll('button')].map((b) => b.textContent?.trim())

describe('login page, site as identity provider', () => {
  it('offers « Sign in with Nexora AI » as the main action and sends sign-up to the site', () => {
    render({ ssoFirst: true, siteSignupUrl: 'https://nexora.example/compte/inscription' })
    const labels = buttonLabels()
    expect(labels[0]).toBe('Sign in with Nexora AI')
    const signup = [...host.querySelectorAll('a')].find((a) => a.textContent === 'Sign up')
    expect(signup?.getAttribute('href')).toBe('https://nexora.example/compte/inscription')
  })

  it('keeps the password form out of sight until the administrator asks for it', () => {
    render({ ssoFirst: true, siteSignupUrl: 'https://nexora.example/compte/inscription' })
    expect(host.querySelector('#password')).toBeNull()
    const open = [...host.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Instance owner or administrator')
    )
    expect(open).toBeDefined()
    act(() => open?.click())
    expect(host.querySelector('#email')).not.toBeNull()
    expect(host.querySelector('#password')).not.toBeNull()
    expect(host.textContent).toContain('for the instance owner')
  })

  it('opens the password form straight away when the page is reached to use it', () => {
    searchParams.set('mode', 'password')
    render({ ssoFirst: true, siteSignupUrl: null })
    expect(host.querySelector('#password')).not.toBeNull()
  })
})

describe('login page, any other instance', () => {
  it('keeps the password form first and the local sign-up link', () => {
    render({ ssoFirst: false, siteSignupUrl: null })
    expect(host.querySelector('#password')).not.toBeNull()
    expect(buttonLabels()).toContain('Sign in with Nexora AI')
    const signup = [...host.querySelectorAll('a')].find((a) => a.textContent === 'Sign up')
    expect(signup?.getAttribute('href')).toBe('/signup')
  })
})
