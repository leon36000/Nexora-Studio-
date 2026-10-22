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
      clientId: 'workstudio',
      clientSecret: 'secret',
      scopes: ['openid', 'profile', 'email'],
      pkce: true,
    })
  })

  it('keeps the issuer exactly as configured, since callbacks compare `iss` verbatim', () => {
    expect(buildNexoraOidcProvider(complete)?.issuer).toBe('https://sso.example.fr/realms/pme/')
    expect(
      buildNexoraOidcProvider({ ...complete, NEXORA_OIDC_ISSUER: ' https://id.example.fr ' })
        ?.issuer
    ).toBe('https://id.example.fr')
  })

  it('lets the identity provider create accounts unless registration is disabled', () => {
    expect(buildNexoraOidcProvider(complete)).toMatchObject({
      disableSignUp: false,
      disableImplicitSignUp: false,
    })
    expect(buildNexoraOidcProvider(complete, { registrationDisabled: true })).toMatchObject({
      disableSignUp: true,
      disableImplicitSignUp: true,
    })
  })
})
