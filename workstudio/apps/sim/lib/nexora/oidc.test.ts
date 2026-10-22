import { describe, expect, it } from 'vitest'
import { buildNexoraOidcProvider, NEXORA_OIDC_PROVIDER_ID } from '@/lib/nexora/oidc'

const complete = {
  NEXORA_OIDC_ISSUER: 'https://sso.example.fr/realms/pme/',
  NEXORA_OIDC_CLIENT_ID: 'workstudio',
  NEXORA_OIDC_CLIENT_SECRET: 'secret',
}

describe('buildNexoraOidcProvider', () => {
  it('is off until issuer, client id and secret are all set', () => {
    expect(buildNexoraOidcProvider({})).toBeNull()
    expect(buildNexoraOidcProvider({ ...complete, NEXORA_OIDC_CLIENT_SECRET: ' ' })).toBeNull()
    expect(buildNexoraOidcProvider({ ...complete, NEXORA_OIDC_ISSUER: undefined })).toBeNull()
  })

  it('discovers the identity provider from its issuer and requests the OIDC identity scopes', () => {
    expect(buildNexoraOidcProvider(complete)).toMatchObject({
      providerId: NEXORA_OIDC_PROVIDER_ID,
      discoveryUrl: 'https://sso.example.fr/realms/pme/.well-known/openid-configuration',
      issuer: 'https://sso.example.fr/realms/pme',
      clientId: 'workstudio',
      clientSecret: 'secret',
      scopes: ['openid', 'profile', 'email'],
      pkce: true,
    })
  })
})
