import { describe, expect, it } from 'vitest'
import { resolveLoginLayout } from '@/lib/nexora/login-layout'

const SITE = 'https://nexora.example'

describe('resolveLoginLayout', () => {
  it('puts the Nexora AI sign-in first when the site is the identity provider', () => {
    expect(
      resolveLoginLayout({ oidcName: 'Nexora AI', siteUrl: SITE, ssoRequired: false })
    ).toEqual({
      ssoFirst: true,
      signupUrl: 'https://nexora.example/compte/inscription',
    })
  })

  it('sends account creation to the site in English under /en', () => {
    expect(
      resolveLoginLayout({ oidcName: 'Nexora AI', siteUrl: SITE, ssoRequired: false, locale: 'en' })
        .signupUrl
    ).toBe('https://nexora.example/en/compte/inscription')
  })

  it('puts any identity provider first once members must use it, without a site sign-up page', () => {
    expect(
      resolveLoginLayout({ oidcName: 'Mon entreprise', siteUrl: null, ssoRequired: true })
    ).toEqual({ ssoFirst: true, signupUrl: null })
  })

  it('keeps the password form first for a company provider that is optional', () => {
    expect(
      resolveLoginLayout({ oidcName: 'Mon entreprise', siteUrl: null, ssoRequired: false })
    ).toEqual({ ssoFirst: false, signupUrl: null })
  })

  it('keeps the usual page when no single sign-in button exists (it is hidden without a name)', () => {
    expect(resolveLoginLayout({ oidcName: null, siteUrl: SITE, ssoRequired: true })).toEqual({
      ssoFirst: false,
      signupUrl: null,
    })
  })
})
