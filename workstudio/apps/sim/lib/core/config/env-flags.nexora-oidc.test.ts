import { describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  vi.stubEnv('NEXORA_OIDC_ISSUER', 'https://sso.example.fr/realms/pme')
  vi.stubEnv('NEXORA_OIDC_CLIENT_ID', 'workstudio')
  vi.stubEnv('NEXORA_OIDC_CLIENT_SECRET', 'secret')
  vi.stubEnv('NEXT_PUBLIC_NEXORA_OIDC_NAME', 'Mon entreprise')
  vi.stubEnv('DISABLE_EMAIL_SIGNUP', '')
})

vi.unmock('@/lib/core/config/env')
vi.unmock('@/lib/core/config/env-flags')

import { isEmailSignupDisabled, isNexoraOidcEnabled } from '@/lib/core/config/env-flags'

describe('email sign-up with company single sign-on', () => {
  it('is closed while the company identity provider is configured', () => {
    expect(isNexoraOidcEnabled).toBe(true)
    expect(isEmailSignupDisabled).toBe(true)
  })
})
