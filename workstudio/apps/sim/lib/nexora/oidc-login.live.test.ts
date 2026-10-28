import { generateKeyPairSync } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { betterAuth } from 'better-auth'
import { memoryAdapter } from 'better-auth/adapters/memory'
import { genericOAuth } from 'better-auth/plugins'
import { exportJWK, SignJWT } from 'jose'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { withConnectorCallbackDefaults } from '@/lib/auth/connectors/callback-defaults'
import { buildNexoraOidcProvider, NEXORA_OIDC_PROVIDER_ID } from '@/lib/nexora/oidc'

/**
 * Company single sign-on end to end against a throwaway OpenID Connect provider on loopback:
 * discovery, PKCE, nonce-bound ID token verification, the callback served at Better Auth's
 * `/callback/:id` while the provider is told the historical `/oauth2/callback/:id` redirect URI,
 * session creation and sign-out. Run with `bun run --cwd apps/sim test --mode live <file>`.
 */
const BASE_URL = 'https://workstudio.test'
const mocks = vi.hoisted(() => ({ baseUrl: 'https://workstudio.test' }))
vi.mock('@/lib/core/utils/urls', () => ({ getBaseUrl: () => mocks.baseUrl }))

const CLIENT_ID = 'nexora-test-client'
const SUBJECT = 'idp-subject-42'

describe('company OpenID Connect sign-in', () => {
  let idp: Server
  let issuer = ''
  const keys = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const codes = new Map<string, { nonce: string; challenge: string; redirectUri: string }>()
  const seen: { redirectUris: string[]; verifiers: string[] } = { redirectUris: [], verifiers: [] }

  beforeAll(async () => {
    const jwk = { ...(await exportJWK(keys.publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' }
    idp = createServer((request, response) => {
      const url = new URL(request.url ?? '/', issuer)
      const json = (body: unknown) => {
        response.setHeader('content-type', 'application/json')
        response.end(JSON.stringify(body))
      }
      if (url.pathname === '/.well-known/openid-configuration') {
        return json({
          issuer,
          authorization_endpoint: `${issuer}/authorize`,
          token_endpoint: `${issuer}/token`,
          userinfo_endpoint: `${issuer}/userinfo`,
          jwks_uri: `${issuer}/jwks`,
          id_token_signing_alg_values_supported: ['RS256'],
        })
      }
      if (url.pathname === '/jwks') return json({ keys: [jwk] })
      if (url.pathname === '/userinfo') {
        return json({
          sub: SUBJECT,
          email: 'dirigeante@pme.test',
          email_verified: true,
          name: 'Dirigeante',
        })
      }
      if (url.pathname === '/token' && request.method === 'POST') {
        let raw = ''
        request.on('data', (chunk) => {
          raw += chunk
        })
        request.on('end', async () => {
          const form = new URLSearchParams(raw)
          const issued = codes.get(form.get('code') ?? '')
          seen.redirectUris.push(form.get('redirect_uri') ?? '')
          seen.verifiers.push(form.get('code_verifier') ?? '')
          if (!issued || form.get('redirect_uri') !== issued.redirectUri) {
            response.statusCode = 400
            return json({ error: 'invalid_grant' })
          }
          const idToken = await new SignJWT({
            email: 'dirigeante@pme.test',
            email_verified: true,
            name: 'Dirigeante',
            nonce: issued.nonce,
          })
            .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
            .setIssuer(issuer)
            .setAudience(CLIENT_ID)
            .setSubject(SUBJECT)
            .setIssuedAt()
            .setExpirationTime('5m')
            .sign(keys.privateKey)
          json({ access_token: 'access', token_type: 'Bearer', expires_in: 300, id_token: idToken })
        })
        return
      }
      response.statusCode = 404
      response.end()
    })
    await new Promise<void>((resolve) => idp.listen(0, '127.0.0.1', resolve))
    issuer = `http://127.0.0.1:${(idp.address() as AddressInfo).port}`
  })

  afterAll(() => new Promise<void>((resolve) => idp.close(() => resolve())))

  it('signs a person in through the historical redirect URI and signs them out', async () => {
    const provider = buildNexoraOidcProvider({
      NEXORA_OIDC_ISSUER: issuer,
      NEXORA_OIDC_CLIENT_ID: CLIENT_ID,
      NEXORA_OIDC_CLIENT_SECRET: 'secret',
    })
    if (!provider) throw new Error('provider not built')
    const database = { user: [], session: [], account: [], verification: [] }
    const auth = betterAuth({
      baseURL: BASE_URL,
      secret: 'oidc-login-live-test-secret-0123456789abcdef',
      database: memoryAdapter(database),
      logger: { disabled: true },
      plugins: [genericOAuth({ config: [withConnectorCallbackDefaults(provider)] })],
    })

    const start = await auth.handler(
      new Request(`${BASE_URL}/api/auth/sign-in/social`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: BASE_URL },
        body: JSON.stringify({ provider: NEXORA_OIDC_PROVIDER_ID, callbackURL: '/workspace' }),
      })
    )
    expect(start.status).toBe(200)
    const { url } = (await start.json()) as { url: string }
    const authorization = new URL(url)
    const redirectUri = `${BASE_URL}/api/auth/oauth2/callback/${NEXORA_OIDC_PROVIDER_ID}`
    expect(authorization.searchParams.get('redirect_uri')).toBe(redirectUri)
    expect(authorization.searchParams.get('code_challenge_method')).toBe('S256')
    const nonce = authorization.searchParams.get('nonce')
    expect(nonce).toBeTruthy()
    const state = authorization.searchParams.get('state') ?? ''
    const stateCookie = start.headers
      .getSetCookie()
      .map((cookie) => cookie.split(';', 1)[0])
      .join('; ')

    codes.set('code-1', {
      nonce: nonce ?? '',
      challenge: authorization.searchParams.get('code_challenge') ?? '',
      redirectUri,
    })
    /** The route handler rewrites the public path; Better Auth serves `/callback/:id`. */
    const callback = await auth.handler(
      new Request(
        `${BASE_URL}/api/auth/callback/${NEXORA_OIDC_PROVIDER_ID}?code=code-1&state=${state}`,
        {
          headers: { cookie: stateCookie },
        }
      )
    )
    expect(callback.status).toBe(302)
    expect(callback.headers.get('location')).toBe('/workspace')
    expect(seen.redirectUris).toEqual([redirectUri])
    expect(seen.verifiers[0]).toBeTruthy()
    expect(database.account).toMatchObject([
      { providerId: NEXORA_OIDC_PROVIDER_ID, accountId: SUBJECT },
    ])
    expect(database.user).toMatchObject([{ email: 'dirigeante@pme.test' }])

    const cookie = callback.headers
      .getSetCookie()
      .map((value) => value.split(';', 1)[0])
      .join('; ')
    const session = await auth.handler(
      new Request(`${BASE_URL}/api/auth/get-session`, { headers: { cookie } })
    )
    expect(await session.json()).toMatchObject({ user: { email: 'dirigeante@pme.test' } })

    const out = await auth.handler(
      new Request(`${BASE_URL}/api/auth/sign-out`, {
        method: 'POST',
        headers: { cookie, origin: BASE_URL, 'content-type': 'application/json' },
        body: '{}',
      })
    )
    expect(out.status).toBe(200)
    const after = await auth.handler(
      new Request(`${BASE_URL}/api/auth/get-session`, { headers: { cookie } })
    )
    expect(await after.json()).toBeNull()
  })

  it('rejects an ID token whose nonce does not match the authorization request', async () => {
    const provider = buildNexoraOidcProvider({
      NEXORA_OIDC_ISSUER: issuer,
      NEXORA_OIDC_CLIENT_ID: CLIENT_ID,
      NEXORA_OIDC_CLIENT_SECRET: 'secret',
    })
    if (!provider) throw new Error('provider not built')
    const database = { user: [], session: [], account: [], verification: [] }
    const auth = betterAuth({
      baseURL: BASE_URL,
      secret: 'oidc-login-live-test-secret-0123456789abcdef',
      database: memoryAdapter(database),
      logger: { disabled: true },
      plugins: [genericOAuth({ config: [withConnectorCallbackDefaults(provider)] })],
    })
    const start = await auth.handler(
      new Request(`${BASE_URL}/api/auth/sign-in/social`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: BASE_URL },
        body: JSON.stringify({ provider: NEXORA_OIDC_PROVIDER_ID, callbackURL: '/workspace' }),
      })
    )
    const authorization = new URL(((await start.json()) as { url: string }).url)
    const stateCookie = start.headers
      .getSetCookie()
      .map((cookie) => cookie.split(';', 1)[0])
      .join('; ')
    codes.set('code-2', {
      nonce: 'not-the-requested-nonce',
      challenge: '',
      redirectUri: `${BASE_URL}/api/auth/oauth2/callback/${NEXORA_OIDC_PROVIDER_ID}`,
    })
    const callback = await auth.handler(
      new Request(
        `${BASE_URL}/api/auth/callback/${NEXORA_OIDC_PROVIDER_ID}?code=code-2&state=${authorization.searchParams.get('state')}`,
        { headers: { cookie: stateCookie } }
      )
    )
    expect(callback.headers.get('location') ?? '').toContain('error=')
    expect(database.session).toHaveLength(0)
  })
})
