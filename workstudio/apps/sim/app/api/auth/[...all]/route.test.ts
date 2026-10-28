import { createMockRequest, resetEnvFlagsMock, setEnvFlags } from '@sim/testing'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const handlerMocks = vi.hoisted(() => ({
  betterAuthGET: vi.fn(),
  betterAuthPOST: vi.fn(),
  credentialGroupCallback: vi.fn(),
  credentialGroupRateLimit: vi.fn(),
  ensureAnonymousUserExists: vi.fn(),
  createAnonymousSession: vi.fn(() => ({
    user: { id: 'anon' },
    session: { id: 'anon-session' },
  })),
}))

vi.mock('better-auth/next-js', () => ({
  toNextJsHandler: () => ({
    GET: handlerMocks.betterAuthGET,
    POST: handlerMocks.betterAuthPOST,
  }),
}))

vi.mock('@/lib/auth/anonymous', () => ({
  ensureAnonymousUserExists: handlerMocks.ensureAnonymousUserExists,
  createAnonymousSession: handlerMocks.createAnonymousSession,
}))

vi.mock('@/lib/credential-groups/oauth-state', () => ({
  isCredentialGroupOAuthState: (state: string) => state.startsWith('cg_'),
}))

vi.mock('@/lib/credential-groups/providers', () => ({
  CREDENTIAL_GROUP_PROVIDER_IDS: ['gmail', 'google-calendar', 'confluence', 'jira', 'slack'],
  CREDENTIAL_GROUP_STANDARD_OAUTH_PROVIDER_IDS: ['gmail', 'google-calendar', 'confluence', 'jira'],
  getCredentialGroupStandardOAuthProviderFromProviderId: (providerId: string) => {
    const providers: Record<string, string> = {
      'google-email': 'gmail',
      'google-calendar': 'google-calendar',
      confluence: 'confluence',
      jira: 'jira',
    }
    const provider = providers[providerId]
    if (!provider) throw new Error(`Unsupported managed OAuth provider: ${providerId}`)
    return provider
  },
}))

vi.mock('@/lib/credential-groups/rate-limit', () => ({
  enforcePublicCredentialGroupIpRateLimit: handlerMocks.credentialGroupRateLimit,
}))

vi.mock('@/app/api/credential-groups/oauth-callback', () => ({
  handleCredentialGroupOAuthCallback: handlerMocks.credentialGroupCallback,
}))

import { GET, POST } from '@/app/api/auth/[...all]/route'

afterAll(resetEnvFlagsMock)
beforeEach(() => setEnvFlags({ isAuthDisabled: false }))

describe('auth catch-all route managed OAuth callbacks', () => {
  beforeEach(() => {
    handlerMocks.credentialGroupRateLimit.mockResolvedValue(null)
    handlerMocks.credentialGroupCallback.mockResolvedValue(new Response(null, { status: 204 }))
  })

  it.each([
    ['google-email', 'gmail'],
    ['google-calendar', 'google-calendar'],
    ['confluence', 'confluence'],
    ['jira', 'jira'],
  ])('dispatches a managed %s callback by its state prefix', async (providerId, provider) => {
    const request = createMockRequest(
      'GET',
      undefined,
      {},
      `http://localhost:3000/api/auth/oauth2/callback/${providerId}?state=cg_attempt&code=code-1`
    )

    const response = await GET(request)

    expect(response.status).toBe(204)
    expect(handlerMocks.credentialGroupRateLimit).toHaveBeenCalledWith(request, 'oauth-callback')
    expect(handlerMocks.credentialGroupCallback).toHaveBeenCalledWith({
      request,
      provider,
      query: { state: 'cg_attempt', code: 'code-1' },
      limited: null,
    })
    expect(handlerMocks.betterAuthGET).not.toHaveBeenCalled()
  })

  it.each([true, false])(
    'preserves connector callbacks with authentication disabled=%s',
    async (authDisabled) => {
      setEnvFlags({ isAuthDisabled: authDisabled })
      handlerMocks.betterAuthGET.mockResolvedValueOnce(new Response(null, { status: 204 }))
      const request = createMockRequest(
        'GET',
        undefined,
        {},
        'http://localhost:3000/api/auth/oauth2/callback/jira?state=better-auth-state&code=code-1'
      )

      const response = await GET(request)

      expect(response.status).toBe(204)
      expect(handlerMocks.betterAuthGET).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          url: 'http://localhost:3000/api/auth/callback/jira?state=better-auth-state&code=code-1',
        })
      )
      expect(handlerMocks.credentialGroupCallback).not.toHaveBeenCalled()
    }
  )

  it('rejects a managed state sent to an unsupported connector callback', async () => {
    const request = createMockRequest(
      'GET',
      undefined,
      {},
      'http://localhost:3000/api/auth/oauth2/callback/unknown?state=cg_attempt&code=code-1'
    )

    const response = await GET(request)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Unsupported managed OAuth provider.',
    })
    expect(handlerMocks.betterAuthGET).not.toHaveBeenCalled()
    expect(handlerMocks.credentialGroupCallback).not.toHaveBeenCalled()
  })
})

describe('auth catch-all route (DISABLE_AUTH get-session)', () => {
  beforeEach(() => {
    setEnvFlags({ isAuthDisabled: false })
  })

  it('returns anonymous session in better-auth response envelope when auth is disabled', async () => {
    setEnvFlags({ isAuthDisabled: true })

    const req = createMockRequest(
      'GET',
      undefined,
      {},
      'http://localhost:3000/api/auth/get-session'
    )

    const res = await GET(req)
    const json = await res.json()

    expect(handlerMocks.ensureAnonymousUserExists).toHaveBeenCalledTimes(1)
    expect(handlerMocks.betterAuthGET).not.toHaveBeenCalled()
    expect(json).toEqual({
      user: { id: 'anon' },
      session: { id: 'anon-session' },
    })
  })
})

describe('auth catch-all route password-reset mail', () => {
  it.each([
    'request-password-reset',
    'email-otp/request-password-reset',
    'forget-password/email-otp',
    /** Matched by shape, so a plugin version that renames or adds an alias cannot reopen it. */
    'request-password-reset/v2',
    'some-plugin/forget-password',
  ])('blocks %s, which reaches the mailer without the per-recipient budget', async (path) => {
    const req = createMockRequest('POST', undefined, {}, `http://localhost:3000/api/auth/${path}`)

    const res = await POST(req)

    expect(res.status).toBe(404)
    expect(handlerMocks.betterAuthPOST).not.toHaveBeenCalled()
    await expect(res.json()).resolves.toEqual({
      error: 'Password reset is handled by application API routes.',
    })
  })

  /**
   * The same endpoint takes the OTP purpose from the body, and `forget-password` there sends reset
   * mail to any address named — blocking the reset paths while leaving this open renames the hole.
   */
  it.each(['forget-password', 'sign-in', 'change-email'])(
    'refuses the verification sender asked for %s',
    async (type) => {
      const req = createMockRequest(
        'POST',
        { email: 'victim@example.com', type },
        {},
        'http://localhost:3000/api/auth/email-otp/send-verification-otp'
      )

      expect((await POST(req)).status).toBe(404)
      expect(handlerMocks.betterAuthPOST).not.toHaveBeenCalled()
    }
  )

  it('refuses the verification sender when the body cannot be read', async () => {
    const req = createMockRequest(
      'POST',
      undefined,
      {},
      'http://localhost:3000/api/auth/email-otp/send-verification-otp'
    )

    expect((await POST(req)).status).toBe(404)
    expect(handlerMocks.betterAuthPOST).not.toHaveBeenCalled()
  })
})

describe('auth catch-all route organization mutations', () => {
  it('blocks Better Auth organization mutation endpoints that bypass app lifecycle rules', async () => {
    const req = createMockRequest(
      'POST',
      undefined,
      {},
      'http://localhost:3000/api/auth/organization/create'
    )

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(handlerMocks.betterAuthPOST).not.toHaveBeenCalled()
    expect(json).toEqual({
      error: 'Organization mutations are handled by application API routes.',
    })
  })
})

describe('auth catch-all route organization reads', () => {
  const INSTANCE_ORGANIZATION = {
    id: 'org-1',
    name: 'PME',
    metadata: {
      instanceOrganization: true,
      nexoraSettings: { smtp: { host: 'smtp.pme.fr', password: 'enc:password' } },
      nexoraBudgets: { instanceMonthlyTokens: 1_000 },
    },
    members: [{ id: 'member-1', role: 'member' }],
  }

  it('strips the Nexora instance settings from the full organization a member reads', async () => {
    handlerMocks.betterAuthGET.mockResolvedValueOnce(
      new Response(JSON.stringify(INSTANCE_ORGANIZATION), {
        status: 200,
        headers: { 'content-type': 'application/json', 'set-cookie': 'session=kept' },
      })
    )

    const response = await GET(
      createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/auth/organization/get-full-organization',
      }),
      {}
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('set-cookie')).toBe('session=kept')
    const body = await response.json()
    expect(body.metadata).toEqual({ instanceOrganization: true })
    expect(body.members).toEqual(INSTANCE_ORGANIZATION.members)
  })

  it('strips them from every organization of the list and from set-active', async () => {
    handlerMocks.betterAuthGET.mockResolvedValueOnce(
      Response.json([INSTANCE_ORGANIZATION, { id: 'org-2', metadata: null }])
    )
    handlerMocks.betterAuthPOST.mockResolvedValueOnce(Response.json(INSTANCE_ORGANIZATION))

    const listed = await GET(
      createMockRequest({ method: 'GET', url: 'http://localhost:3000/api/auth/organization/list' }),
      {}
    )
    const activated = await POST(
      createMockRequest({
        method: 'POST',
        body: { organizationId: 'org-1' },
        url: 'http://localhost:3000/api/auth/organization/set-active',
      }),
      {}
    )

    expect(JSON.stringify(await listed.json())).not.toMatch(/nexora|smtp/i)
    expect(JSON.stringify(await activated.json())).not.toMatch(/nexora|smtp/i)
  })
})

describe('auth catch-all route SSO provider mutations', () => {
  it.each([
    'sso/update-provider',
    'sso/delete-provider',
    'sso/request-domain-verification',
    'sso/verify-domain',
  ])('blocks the plugin-served %s endpoint', async (path) => {
    const req = createMockRequest('POST', undefined, {}, `http://localhost:3000/api/auth/${path}`)

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(handlerMocks.betterAuthPOST).not.toHaveBeenCalled()
    expect(json).toEqual({
      error: 'SSO provider mutations are handled by application API routes.',
    })
  })
})

describe('OAuth provider client endpoints', () => {
  beforeEach(() => {
    handlerMocks.betterAuthPOST.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    )
  })

  it.each(['.well-known/openid-configuration', 'oauth2/end-session', 'oauth2/userinfo'])(
    'does not expose the OIDC-only %s endpoint',
    async (path) => {
      const getResponse = await GET(
        createMockRequest('GET', undefined, {}, `http://localhost:3000/api/auth/${path}`)
      )
      const postResponse = await POST(
        createMockRequest('POST', {}, {}, `http://localhost:3000/api/auth/${path}`)
      )

      expect(getResponse.status).toBe(404)
      expect(postResponse.status).toBe(404)
      expect(getResponse.headers.get('cache-control')).toBe('no-store')
      expect(handlerMocks.betterAuthGET).not.toHaveBeenCalled()
      expect(handlerMocks.betterAuthPOST).not.toHaveBeenCalled()
    }
  )

  /**
   * The plugin gates client creation on a session alone, so without this any
   * signed-in user could register a client with arbitrary redirect URIs and
   * the full scope set. Nothing must reach the plugin.
   */
  it.each([
    'oauth2/create-client',
    'oauth2/update-client',
    'oauth2/delete-client',
    'oauth2/client/rotate-secret',
    'oauth2/register',
    'oauth2/introspect',
    'oauth2/token',
    'oauth2/revoke',
    'oauth2/anything-a-future-version-adds',
  ])('refuses POST /%s without reaching Better Auth', async (path) => {
    const req = createMockRequest('POST', {}, {}, `http://localhost:3000/api/auth/${path}`)

    const res = await POST(req)

    expect(res.status).toBe(404)
    expect(handlerMocks.betterAuthPOST).not.toHaveBeenCalled()
  })

  it.each([true, false])(
    'preserves connector POST callbacks with authentication disabled=%s',
    async (authDisabled) => {
      setEnvFlags({ isAuthDisabled: authDisabled })
      const request = createMockRequest(
        'POST',
        {},
        {},
        'http://localhost:3000/api/auth/oauth2/callback/jira'
      )
      expect((await POST(request)).status).toBe(200)
      expect(handlerMocks.betterAuthPOST).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ url: 'http://localhost:3000/api/auth/callback/jira' })
      )
    }
  )

  it.each([true, false])(
    'preserves authenticated connector linking with authentication disabled=%s',
    async (authDisabled) => {
      setEnvFlags({ isAuthDisabled: authDisabled })
      const request = createMockRequest(
        'POST',
        { provider: 'google-email', callbackURL: 'http://localhost:3000/workspace' },
        { cookie: 'better-auth.session_token=existing-session' },
        'http://localhost:3000/api/auth/link-social'
      )

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(handlerMocks.betterAuthPOST).toHaveBeenCalledExactlyOnceWith(request)
    }
  )
})
