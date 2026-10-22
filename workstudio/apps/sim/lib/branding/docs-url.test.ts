import { afterEach, describe, expect, it, vi } from 'vitest'

const getEnvMock = vi.hoisted(() => vi.fn<(name: string) => string | undefined>())
vi.mock('@/lib/core/config/env', () => ({ getEnv: getEnvMock, env: {} }))

import { docsUrl, NEXORA_GUIDE_URL } from '@/lib/branding/docs-url'

afterEach(() => {
  getEnvMock.mockReset()
})

describe('docsUrl', () => {
  it('points to the Nexora guide when no documentation site is configured', () => {
    getEnvMock.mockReturnValue(undefined)
    expect(docsUrl('/tools/slack')).toBe(NEXORA_GUIDE_URL)
    expect(docsUrl()).toBe(NEXORA_GUIDE_URL)
  })

  it('joins the configured documentation site and the page path', () => {
    getEnvMock.mockImplementation((name) =>
      name === 'NEXT_PUBLIC_DOCUMENTATION_URL' ? 'https://docs.nexora.example/' : undefined
    )
    expect(docsUrl('/tools/slack')).toBe('https://docs.nexora.example/tools/slack')
    expect(docsUrl('tools/slack#auth')).toBe('https://docs.nexora.example/tools/slack#auth')
    expect(docsUrl()).toBe('https://docs.nexora.example')
  })

  it('ignores a blank configured value', () => {
    getEnvMock.mockReturnValue('   ')
    expect(docsUrl('/x')).toBe(NEXORA_GUIDE_URL)
  })

  it('never points to a Sim-hosted site', () => {
    getEnvMock.mockReturnValue(undefined)
    expect(docsUrl('/x')).not.toMatch(/sim\.ai/)
  })
})
