import { describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  vi.stubEnv('NEXORA_OIDC_ISSUER', 'https://sso.example.fr/realms/pme')
  vi.stubEnv('NEXORA_OIDC_CLIENT_ID', 'workstudio')
  vi.stubEnv('NEXORA_OIDC_CLIENT_SECRET', 'secret')
  vi.stubEnv('NEXT_PUBLIC_NEXORA_OIDC_NAME', '')
  vi.stubEnv('DISABLE_EMAIL_SIGNUP', '')
})

vi.unmock('@/lib/core/config/env')
vi.unmock('@/lib/core/config/env-flags')

import { isEmailSignupDisabled, isNexoraOidcEnabled } from '@/lib/core/config/env-flags'

describe('company single sign-on without a button label', () => {
  it('stays off, so email sign-up is not closed with no SSO button to replace it', () => {
    expect(isNexoraOidcEnabled).toBe(false)
    expect(isEmailSignupDisabled).toBe(false)
  })
})
