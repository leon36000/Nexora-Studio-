import { describe, expect, it, vi } from 'vitest'

vi.unmock('@/lib/core/config/env')
vi.unmock('@/lib/core/config/env-flags')

async function loadFlags(vars: Record<string, string | undefined>) {
  vi.resetModules()
  for (const [key, value] of Object.entries(vars)) vi.stubEnv(key, value)
  return import('@/lib/core/config/env-flags')
}

async function loadMothershipConstants(vars: Record<string, string | undefined>) {
  vi.resetModules()
  for (const [key, value] of Object.entries(vars)) vi.stubEnv(key, value)
  return import('@/lib/mothership/constants')
}

describe('Nexora edition: Chat (mothership) surfaces', () => {
  it('are hidden when nothing is configured', async () => {
    const { isChatEnabled } = await loadFlags({
      NEXT_PUBLIC_CHAT_ENABLED: undefined,
      NEXT_PUBLIC_CHAT_DISABLED: undefined,
    })
    expect(isChatEnabled).toBe(false)
  })

  it('are shown only when explicitly enabled', async () => {
    const { isChatEnabled } = await loadFlags({ NEXT_PUBLIC_CHAT_ENABLED: 'true' })
    expect(isChatEnabled).toBe(true)
  })

  it('stay hidden when also explicitly disabled', async () => {
    const { isChatEnabled } = await loadFlags({
      NEXT_PUBLIC_CHAT_ENABLED: 'true',
      NEXT_PUBLIC_CHAT_DISABLED: 'true',
    })
    expect(isChatEnabled).toBe(false)
  })
})

describe('Nexora edition: copilot backend URL', () => {
  it('never defaults to a Sim-hosted service', async () => {
    const { SIM_AGENT_API_URL, SIM_AGENT_API_URL_DEFAULT } = await loadMothershipConstants({
      SIM_AGENT_API_URL: undefined,
    })
    expect(SIM_AGENT_API_URL_DEFAULT).not.toMatch(/sim\.ai|simstudio/)
    expect(new URL(SIM_AGENT_API_URL).hostname.endsWith('.invalid')).toBe(true)
  })

  it('uses the configured URL when one is provided', async () => {
    const { SIM_AGENT_API_URL } = await loadMothershipConstants({
      SIM_AGENT_API_URL: 'https://agent.nexora.example',
    })
    expect(SIM_AGENT_API_URL).toBe('https://agent.nexora.example')
  })
})
