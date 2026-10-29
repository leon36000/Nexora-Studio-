import { resetEnvMock, setEnv } from '@sim/testing/mocks/env.mock'
import { afterEach, describe, expect, it } from 'vitest'
import { buildHostedUpgradeUrl, hostedBillingSettingsUrl } from '@/lib/billing/upgrade-reasons'

afterEach(() => {
  resetEnvMock()
})

describe('where a person raises a limit or tops up', () => {
  it('is the wallet page of the Nexora AI site, whatever the reason', () => {
    setEnv({ NEXT_PUBLIC_NEXORA_SITE_URL: 'https://nexora.example' })
    expect(buildHostedUpgradeUrl()).toBe('https://nexora.example/compte/facturation')
    expect(buildHostedUpgradeUrl('credits')).toBe('https://nexora.example/compte/facturation')
    expect(hostedBillingSettingsUrl()).toBe('https://nexora.example/compte/facturation')
  })

  it('stays on the instance, never on a repository or an upstream site, without the site', () => {
    setEnv({ NEXT_PUBLIC_NEXORA_SITE_URL: undefined })
    expect(buildHostedUpgradeUrl('storage')).toBe('/')
    expect(hostedBillingSettingsUrl()).toBe('/')
  })
})
