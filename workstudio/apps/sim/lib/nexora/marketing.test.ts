import { describe, expect, it } from 'vitest'
import { resolveMarketingRedirect } from '@/lib/nexora/marketing'

const none = { termsUrl: undefined, privacyUrl: undefined }

describe('resolveMarketingRedirect (Nexora edition: upstream marketing site is not served)', () => {
  it.each([
    '/',
    '/pricing',
    '/blog/some-post',
    '/careers',
    '/changelog',
    '/integrations/slack',
    '/llms.txt',
    '/index.md',
    '/changelog.xml',
  ])('sends %s to the sign-in page', (path) => {
    expect(resolveMarketingRedirect(path, none)).toBe('/login')
  })

  it('sends legal pages to the configured documents when they exist', () => {
    const urls = { termsUrl: 'https://legal.example/cgu', privacyUrl: 'https://legal.example/rgpd' }
    expect(resolveMarketingRedirect('/terms', urls)).toBe('https://legal.example/cgu')
    expect(resolveMarketingRedirect('/privacy', urls)).toBe('https://legal.example/rgpd')
  })

  it('sends legal pages to the sign-in page when none is configured', () => {
    expect(resolveMarketingRedirect('/terms', none)).toBe('/login')
    expect(resolveMarketingRedirect('/privacy', none)).toBe('/login')
  })

  it.each([
    '/login',
    '/signup',
    '/workspace/abc/w/def',
    '/chat/support',
    '/invite/x',
    '/api/health',
    '/o/org',
  ])('leaves application path %s alone', (path) => {
    expect(resolveMarketingRedirect(path, none)).toBeNull()
  })
})
