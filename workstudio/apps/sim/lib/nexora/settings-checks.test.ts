import { describe, expect, it, vi } from 'vitest'
import { checkOidcDiscovery, classifySmtpError } from '@/lib/nexora/settings-checks'

function smtpError(fields: Record<string, unknown>) {
  return Object.assign(new Error('smtp failure'), fields)
}

describe('SMTP test failures', () => {
  it('names the cause an administrator can act on', () => {
    expect(classifySmtpError(smtpError({ code: 'EAUTH', responseCode: 535 }))).toBe('auth')
    expect(classifySmtpError(smtpError({ code: 'ESOCKET', errno: 'ECONNREFUSED' }))).toBe(
      'connection'
    )
    expect(classifySmtpError(smtpError({ code: 'EDNS' }))).toBe('connection')
    expect(classifySmtpError(smtpError({ code: 'ETIMEDOUT' }))).toBe('timeout')
    expect(classifySmtpError(smtpError({ code: 'ETLS' }))).toBe('tls')
    expect(classifySmtpError(smtpError({ code: 'EENVELOPE', responseCode: 550 }))).toBe('rejected')
    expect(classifySmtpError(smtpError({ code: 'EMESSAGE', responseCode: 554 }))).toBe('rejected')
    expect(classifySmtpError(new Error('wrong version number'))).toBe('tls')
    expect(classifySmtpError('boom')).toBe('unknown')
  })
})

function discoveryFetch(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status }))
}

describe('OpenID Connect discovery check', () => {
  const issuer = 'https://sso.pme.fr/realms/pme'
  const document = {
    issuer,
    authorization_endpoint: `${issuer}/protocol/openid-connect/auth`,
    token_endpoint: `${issuer}/protocol/openid-connect/token`,
  }

  it('reads the discovery document under the issuer, a trailing slash typed or not', async () => {
    const fetchImpl = discoveryFetch(200, document)
    expect(await checkOidcDiscovery(`${issuer}/`, fetchImpl)).toEqual({
      ok: true,
      issuer,
      authorizationEndpoint: document.authorization_endpoint,
      issuerMatches: true,
    })
    expect(fetchImpl).toHaveBeenCalledWith(
      `${issuer}/.well-known/openid-configuration`,
      expect.objectContaining({ redirect: 'error' })
    )
  })

  it('flags a provider announcing another address, which the browser would be sent to', async () => {
    const result = await checkOidcDiscovery(
      'http://keycloak:8080/realms/pme',
      discoveryFetch(200, document)
    )
    expect(result).toMatchObject({ ok: true, issuerMatches: false })
  })

  it('fails on a missing or incomplete discovery document', async () => {
    expect(await checkOidcDiscovery(issuer, discoveryFetch(404, {}))).toEqual({
      ok: false,
      reason: 'not-found',
    })
    expect(
      await checkOidcDiscovery(issuer, discoveryFetch(200, { issuer, token_endpoint: 'x' }))
    ).toEqual({ ok: false, reason: 'invalid' })
    const notJson = vi.fn(async () => new Response('<html>', { status: 200 }))
    expect(await checkOidcDiscovery(issuer, notJson)).toEqual({ ok: false, reason: 'invalid' })
  })

  it('tells an unreachable provider from a slow one, and refuses a non-http issuer', async () => {
    const refused = vi.fn(async () => {
      throw new TypeError('fetch failed')
    })
    expect(await checkOidcDiscovery(issuer, refused)).toEqual({ ok: false, reason: 'unreachable' })
    const slow = vi.fn(async () => {
      throw new DOMException('The operation timed out.', 'TimeoutError')
    })
    expect(await checkOidcDiscovery(issuer, slow)).toEqual({ ok: false, reason: 'timeout' })
    const never = vi.fn()
    expect(await checkOidcDiscovery('file:///etc/passwd', never)).toEqual({
      ok: false,
      reason: 'invalid-issuer',
    })
    expect(never).not.toHaveBeenCalled()
  })
})
