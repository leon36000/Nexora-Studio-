import { resetEnvMock, setEnv } from '@sim/testing/mocks/env.mock'
import { afterEach, describe, expect, it } from 'vitest'
import { docsUrl } from '@/lib/branding/docs-url'

afterEach(() => {
  resetEnvMock()
})

describe('docsUrl', () => {
  it('joins the configured documentation site and the page path', () => {
    setEnv({ NEXT_PUBLIC_DOCUMENTATION_URL: 'https://docs.nexora.example/' })
    expect(docsUrl('/tools/slack')).toBe('https://docs.nexora.example/tools/slack')
    expect(docsUrl('tools/slack#auth')).toBe('https://docs.nexora.example/tools/slack#auth')
    expect(docsUrl()).toBe('https://docs.nexora.example')
  })

  it('sends help to the Nexora AI site’s contact page while no documentation site exists', () => {
    setEnv({
      NEXT_PUBLIC_DOCUMENTATION_URL: undefined,
      NEXT_PUBLIC_NEXORA_SITE_URL: 'https://nexora.example',
    })
    expect(docsUrl()).toBe('https://nexora.example/contact')
    expect(docsUrl('/workflows/blocks/agent')).toBe('https://nexora.example/contact')
  })

  it('ignores a blank configured value', () => {
    setEnv({
      NEXT_PUBLIC_DOCUMENTATION_URL: '   ',
      NEXT_PUBLIC_NEXORA_SITE_URL: 'https://nexora.example',
    })
    expect(docsUrl('/x')).toBe('https://nexora.example/contact')
  })

  it('stays on the instance when there is neither a documentation site nor the Nexora AI site', () => {
    setEnv({ NEXT_PUBLIC_DOCUMENTATION_URL: undefined, NEXT_PUBLIC_NEXORA_SITE_URL: undefined })
    expect(docsUrl('/x')).toBe('/')
  })

  it('never points to GitHub or a Sim-hosted site', () => {
    for (const env of [
      {},
      { NEXT_PUBLIC_NEXORA_SITE_URL: 'https://nexora.example' },
      { NEXT_PUBLIC_DOCUMENTATION_URL: 'https://docs.nexora.example' },
    ]) {
      setEnv({
        NEXT_PUBLIC_DOCUMENTATION_URL: undefined,
        NEXT_PUBLIC_NEXORA_SITE_URL: undefined,
        ...env,
      })
      expect(docsUrl('/workflows')).not.toMatch(/sim\.ai|github\.com|simstudio/)
    }
  })
})
