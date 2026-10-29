import { describe, expect, it, vi } from 'vitest'
import {
  deriveNexoraSiteUrl,
  getNexoraSiteUrl,
  nexoraSiteLinks,
  publishNexoraSiteUrl,
} from '@/lib/nexora/site-links'

describe('deriveNexoraSiteUrl', () => {
  it('drops the /api/auth path of the issuer', () => {
    expect(deriveNexoraSiteUrl('https://nexora.example/api/auth')).toBe('https://nexora.example')
    expect(deriveNexoraSiteUrl('https://gx10.ts.net:10000/api/auth/')).toBe(
      'https://gx10.ts.net:10000'
    )
  })

  it('keeps a path prefix the site is served under', () => {
    expect(deriveNexoraSiteUrl('https://example.fr/nexora/api/auth')).toBe(
      'https://example.fr/nexora'
    )
  })

  it('forgets credentials, query and fragment of the issuer', () => {
    expect(deriveNexoraSiteUrl('https://user:pw@nexora.example/api/auth?x=1#y')).toBe(
      'https://nexora.example'
    )
  })

  it('is null for an issuer that is not the site’s (another identity provider, junk, no scheme)', () => {
    expect(deriveNexoraSiteUrl('https://sso.example.fr/realms/pme')).toBeNull()
    expect(deriveNexoraSiteUrl('ftp://nexora.example/api/auth')).toBeNull()
    expect(deriveNexoraSiteUrl('nexora.example/api/auth')).toBeNull()
    expect(deriveNexoraSiteUrl('')).toBeNull()
    expect(deriveNexoraSiteUrl(undefined)).toBeNull()
  })
})

describe('nexoraSiteLinks', () => {
  it('points to the account pages of the site, French without prefix', () => {
    expect(nexoraSiteLinks('https://nexora.example', 'fr')).toEqual({
      signup: 'https://nexora.example/compte/inscription',
      account: 'https://nexora.example/compte',
      billing: 'https://nexora.example/compte/facturation',
      activity: 'https://nexora.example/compte/activite',
      contact: 'https://nexora.example/contact',
    })
  })

  it('takes the English pages under /en, for en and en-CA', () => {
    expect(nexoraSiteLinks('https://nexora.example', 'en-CA')?.billing).toBe(
      'https://nexora.example/en/compte/facturation'
    )
    expect(nexoraSiteLinks('https://nexora.example/nexora', 'en')?.signup).toBe(
      'https://nexora.example/nexora/en/compte/inscription'
    )
  })

  it('is null without a site', () => {
    expect(nexoraSiteLinks(null, 'fr')).toBeNull()
  })
})

describe('getNexoraSiteUrl / publishNexoraSiteUrl', () => {
  it('reads the public variable the server published at start', () => {
    vi.stubEnv('NEXT_PUBLIC_NEXORA_SITE_URL', 'https://nexora.example')
    expect(getNexoraSiteUrl()).toBe('https://nexora.example')
  })

  it('falls back to the issuer on the server', () => {
    vi.stubEnv('NEXT_PUBLIC_NEXORA_SITE_URL', '')
    vi.stubEnv('NEXORA_OIDC_ISSUER', 'https://nexora.example/api/auth')
    expect(getNexoraSiteUrl()).toBe('https://nexora.example')
  })

  it('is null for an instance without the site', () => {
    vi.stubEnv('NEXT_PUBLIC_NEXORA_SITE_URL', '')
    vi.stubEnv('NEXORA_OIDC_ISSUER', '')
    expect(getNexoraSiteUrl()).toBeNull()
  })

  it('publishes the address derived from the issuer, never over one the operator set', () => {
    const env: Record<string, string | undefined> = {
      NEXORA_OIDC_ISSUER: 'https://nexora.example/api/auth',
    }
    publishNexoraSiteUrl(env)
    expect(env.NEXT_PUBLIC_NEXORA_SITE_URL).toBe('https://nexora.example')

    const explicit: Record<string, string | undefined> = {
      NEXORA_OIDC_ISSUER: 'https://nexora.example/api/auth',
      NEXT_PUBLIC_NEXORA_SITE_URL: 'https://autre.example',
    }
    publishNexoraSiteUrl(explicit)
    expect(explicit.NEXT_PUBLIC_NEXORA_SITE_URL).toBe('https://autre.example')

    const other: Record<string, string | undefined> = {
      NEXORA_OIDC_ISSUER: 'https://sso.example.fr/realms/pme',
    }
    publishNexoraSiteUrl(other)
    expect(other.NEXT_PUBLIC_NEXORA_SITE_URL).toBeUndefined()
  })
})
