import { describe, expect, it } from 'vitest'
import { isPublicOAuthRedirect } from '@/lib/nexora/oauth-redirect'

describe('isPublicOAuthRedirect', () => {
  it('accepts a callback a provider can reach', () => {
    expect(isPublicOAuthRedirect('https://connect.pme.fr/oauth/callback')).toBe(true)
    expect(isPublicOAuthRedirect('http://81.2.69.160:8400/oauth/callback')).toBe(true)
  })

  it.each([
    'http://localhost:8400/oauth/callback',
    'http://connect.localhost/oauth/callback',
    'http://127.0.0.1:8400/oauth/callback',
    'http://127.8.9.10/oauth/callback',
    'http://[::1]:8400/oauth/callback',
    'http://10.0.0.4/oauth/callback',
    'http://172.16.5.4/oauth/callback',
    'http://172.31.255.1/oauth/callback',
    'http://192.168.1.20:8400/oauth/callback',
    'http://169.254.169.254/oauth/callback',
    'http://[fd00::1]/oauth/callback',
    'http://nexora.local/oauth/callback',
    'http://nexora-connect:3000/oauth/callback',
    'http://0.0.0.0:8400/oauth/callback',
  ])('treats %s as not public: OAuth stays unavailable', (uri) => {
    expect(isPublicOAuthRedirect(uri)).toBe(false)
  })

  it('treats a missing or malformed callback as not public', () => {
    expect(isPublicOAuthRedirect(null)).toBe(false)
    expect(isPublicOAuthRedirect('')).toBe(false)
    expect(isPublicOAuthRedirect('not a url')).toBe(false)
  })

  it('does not mistake a public name that merely contains a private-looking part', () => {
    expect(isPublicOAuthRedirect('https://local.pme.fr/oauth/callback')).toBe(true)
    expect(isPublicOAuthRedirect('https://10.pme.fr/oauth/callback')).toBe(true)
  })
})
