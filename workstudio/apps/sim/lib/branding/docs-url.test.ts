import { resetEnvMock, setEnv } from '@sim/testing/mocks/env.mock'
import { afterEach, describe, expect, it } from 'vitest'
import { docsUrl, NEXORA_GUIDE_PAGE_BASE, NEXORA_GUIDE_URL } from '@/lib/branding/docs-url'

afterEach(() => {
  resetEnvMock()
})

describe('docsUrl', () => {
  it('points to the Nexora guide index when no documentation site is configured', () => {
    setEnv({ NEXT_PUBLIC_DOCUMENTATION_URL: undefined })
    expect(docsUrl()).toBe(NEXORA_GUIDE_URL)
    expect(docsUrl('/quick-reference')).toBe(NEXORA_GUIDE_URL)
  })

  it('points each help link to the guide page of its screen', () => {
    setEnv({ NEXT_PUBLIC_DOCUMENTATION_URL: undefined })
    const page = (name: string) => `${NEXORA_GUIDE_PAGE_BASE}/${name}`
    expect(docsUrl('/workflows/blocks/agent')).toBe(page('blocs.md#agent'))
    expect(docsUrl('/workflows/triggers/schedule')).toBe(page('blocs.md#declencheurs'))
    expect(docsUrl('/tools/slack')).toBe(page('integrations.md'))
    expect(docsUrl('/integrations/notion')).toBe(page('integrations.md'))
    expect(docsUrl('/knowledgebase')).toBe(page('connaissances.md'))
    expect(docsUrl('/tables')).toBe(page('tables.md'))
    expect(docsUrl('/mcp/overview')).toBe(page('outils-mcp.md'))
    expect(docsUrl('/logs-debugging')).toBe(page('journaux.md'))
    expect(docsUrl('/workflows/deployment')).toBe(page('workflows.md#deployer'))
    expect(docsUrl('/platform/enterprise/sso')).toBe(page('reglages.md'))
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
