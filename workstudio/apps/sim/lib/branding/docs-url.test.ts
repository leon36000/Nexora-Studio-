import { resetEnvMock, setEnv } from '@sim/testing/mocks/env.mock'
import { afterEach, describe, expect, it } from 'vitest'
import { docsUrl, NEXORA_GUIDE_URL } from '@/lib/branding/docs-url'

afterEach(() => {
  resetEnvMock()
})

describe('docsUrl', () => {
  it('points to the Nexora guide when no documentation site is configured', () => {
    setEnv({ NEXT_PUBLIC_DOCUMENTATION_URL: undefined })
    expect(docsUrl('/tools/slack')).toBe(NEXORA_GUIDE_URL)
    expect(docsUrl()).toBe(NEXORA_GUIDE_URL)
  })

  it('joins the configured documentation site and the page path', () => {
    setEnv({ NEXT_PUBLIC_DOCUMENTATION_URL: 'https://docs.nexora.example/' })
    expect(docsUrl('/tools/slack')).toBe('https://docs.nexora.example/tools/slack')
    expect(docsUrl('tools/slack#auth')).toBe('https://docs.nexora.example/tools/slack#auth')
    expect(docsUrl()).toBe('https://docs.nexora.example')
  })

  it('ignores a blank configured value', () => {
    setEnv({ NEXT_PUBLIC_DOCUMENTATION_URL: '   ' })
    expect(docsUrl('/x')).toBe(NEXORA_GUIDE_URL)
  })

  it('never points to a Sim-hosted site', () => {
    setEnv({ NEXT_PUBLIC_DOCUMENTATION_URL: undefined })
    expect(docsUrl('/x')).not.toMatch(/sim\.ai/)
  })
})
