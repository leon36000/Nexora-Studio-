import { jsonResponse } from '@sim/testing/helpers/http'
import { describe, expect, it } from 'vitest'
import {
  ConnectRefusedError,
  ConnectUnavailableError,
  connectWithCredentials,
  disconnect,
  getOAuthStatus,
  getServiceDetail,
  hasWorkspaceToken,
  listCatalog,
  listWorkspaceConnections,
  setOAuthApp,
  startOAuth,
  syncWorkspaceToken,
  workspaceConnectionName,
} from '@/lib/nexora/connect-admin'

const ADMIN = 'connect-admin-token'
const WS = '7e6d4bb7-c706-4514-8019-2335a23dd25b'
const OTHER = 'b080d514-99f2-4361-b731-6cc779e95f86'

interface FakeConnection {
  id: string
  service: string
  connectionName: string
  authType: string
  virtual: boolean
}

interface FakeToken {
  id: string
  name: string
  allowedActions: string[]
  blockedActions: string[]
  allowedProxies: string[]
  allowedConnections: string[]
  allowedTriggers: string[]
}

const CATALOG = [
  {
    service: 'brevo',
    displayName: 'Brevo',
    description: 'E-mails et SMS',
    categories: ['marketing'],
    authTypes: ['api_key'],
    homepageUrl: 'https://www.brevo.com',
    execution: { actionCount: 42 },
    actions: [
      {
        id: 'brevo.send_email',
        name: 'send_email',
        description: 'Send an e-mail',
        inputSchema: { big: true },
      },
    ],
    setup: [{ heavy: true }],
  },
  {
    service: 'google_calendar',
    displayName: 'Google Calendar',
    categories: ['productivity'],
    authTypes: ['oauth2'],
    iconUrl: 'https://cdn.example/gcal.svg',
    execution: { actionCount: 12 },
    actions: [],
  },
]

/** In-memory Nexora Connect admin API with the rules WorkStudio relies on. */
function fakeConnect() {
  let next = 1
  const state = {
    connections: [] as FakeConnection[],
    tokens: [] as FakeToken[],
    rejectKeys: new Set<string>(),
    down: false,
    catalogFetches: 0,
    oauthConfigs: {} as Record<string, unknown>,
  }
  const fetchFn = async (input: string | URL | Request, init?: RequestInit) => {
    if (state.down) throw new TypeError('fetch failed')
    const url = new URL(String(input))
    const method = init?.method ?? 'GET'
    if (new Headers(init?.headers).get('Authorization') !== `Bearer ${ADMIN}`) {
      return jsonResponse({ error: { code: 'unauthorized', message: 'no' } }, 401)
    }
    const body = init?.body ? JSON.parse(String(init.body)) : undefined
    const path = url.pathname
    const connectionMatch = path.match(/^\/api\/connections\/([\w-]+)$/)
    if (path === '/api/connections' && method === 'GET') return jsonResponse(state.connections)
    if (path === '/api/providers' && method === 'GET') {
      state.catalogFetches++
      return jsonResponse(CATALOG)
    }
    const setupMatch = path.match(/^\/v1\/providers\/([\w-]+)\/setup$/)
    if (setupMatch) {
      return jsonResponse({
        success: true,
        message: 'OK',
        data: {
          service: setupMatch[1],
          auth: [
            {
              type: 'api_key',
              fields: [
                {
                  key: 'apiKey',
                  label: 'API key',
                  inputType: 'password',
                  required: true,
                  secret: true,
                },
              ],
            },
          ],
        },
      })
    }
    const requestMatch = path.match(/^\/v1\/connection-requests\/([\w-]+)$/)
    if (requestMatch) {
      return jsonResponse({
        success: true,
        message: 'OK',
        data: {
          connectionRequestId: requestMatch[1],
          service: 'google_calendar',
          status: 'connected',
          appId: 'conn-9',
          errorMessage: null,
        },
      })
    }
    const oauthMatch = path.match(/^\/api\/oauth\/configs\/([\w-]+)$/)
    if (oauthMatch && method === 'PUT') {
      state.oauthConfigs[oauthMatch[1]] = body
      return jsonResponse({
        service: oauthMatch[1],
        configured: true,
        clientId: body.clientId,
        expectedRedirectUri: 'https://connect.pme.fr/oauth/callback',
      })
    }
    if (connectionMatch && method === 'PUT') {
      if (!body.values || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(body.connectionName)) {
        return jsonResponse({ error: { code: 'invalid_input', message: 'bad' } }, 400)
      }
      if (state.rejectKeys.has(body.values.apiKey)) {
        return jsonResponse(
          { error: { code: 'credential_invalid', message: 'key refused upstream' } },
          400
        )
      }
      const existing = state.connections.find(
        (c) => c.service === connectionMatch[1] && c.connectionName === body.connectionName
      )
      if (existing) return jsonResponse(existing)
      const created = {
        id: `conn-${next++}`,
        service: connectionMatch[1],
        connectionName: body.connectionName,
        authType: body.authType,
        virtual: false,
      }
      state.connections.push(created)
      return jsonResponse(created)
    }
    if (connectionMatch && method === 'DELETE') {
      state.connections = state.connections.filter(
        (c) => !(c.service === connectionMatch[1] && c.connectionName === body.connectionName)
      )
      return jsonResponse({ service: connectionMatch[1], connectionName: body.connectionName })
    }
    if (path === '/api/oauth/connection-requests' && method === 'POST') {
      return jsonResponse({
        connectionRequestId: 'req-1',
        authorizationUrl: 'https://accounts.example/consent',
        status: 'initiated',
      })
    }
    if (path === '/api/runtime-tokens' && method === 'GET') {
      return jsonResponse(state.tokens)
    }
    if (path === '/api/runtime-tokens' && method === 'POST') {
      const token = { id: `tok-${next++}`, ...body }
      state.tokens.push(token)
      return jsonResponse({ token: `oct_secret_${token.id}`, record: token })
    }
    const tokenMatch = path.match(/^\/api\/runtime-tokens\/([\w-]+)$/)
    if (tokenMatch && method === 'PUT') {
      const token = state.tokens.find((t) => t.id === tokenMatch[1])
      const required = ['allowedActions', 'blockedActions', 'allowedProxies', 'allowedConnections']
      if (!token || required.some((k) => !Array.isArray(body[k]))) {
        return jsonResponse({ error: { code: 'invalid_input', message: 'bad' } }, 400)
      }
      Object.assign(token, body)
      return jsonResponse(token)
    }
    return jsonResponse({ error: { code: 'not_found', message: `${method} ${path}` } }, 404)
  }
  return { state, fetchFn: fetchFn as typeof fetch }
}

let instance = 0

function setup() {
  const connect = fakeConnect()
  // One address per test: the catalog is cached per Nexora Connect address.
  const options = {
    config: { baseUrl: `http://nexora-connect-${++instance}:3000`, adminToken: ADMIN },
    fetchFn: connect.fetchFn,
  }
  return { ...connect, options }
}

describe('Nexora Connect administration', () => {
  it('names a workspace connection within Connect’s naming rule', () => {
    const name = workspaceConnectionName(WS)
    expect(name).toBe(`ws-${WS}`)
    expect(name).toMatch(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/)
  })

  it('stores an API key as the workspace’s named connection', async () => {
    const { state, options } = setup()
    await connectWithCredentials(WS, 'brevo', 'api_key', { apiKey: 'xkeysib-1' }, options)
    expect(state.connections).toMatchObject([
      { service: 'brevo', connectionName: `ws-${WS}`, authType: 'api_key' },
    ])
  })

  it('lists only the workspace’s own stored connections', async () => {
    const { state, options } = setup()
    await connectWithCredentials(WS, 'brevo', 'api_key', { apiKey: 'a' }, options)
    await connectWithCredentials(OTHER, 'brevo', 'api_key', { apiKey: 'b' }, options)
    state.connections.push({
      id: 'v',
      service: 'wikipedia',
      connectionName: 'default',
      authType: 'no_auth',
      virtual: true,
    })
    expect((await listWorkspaceConnections(WS, options)).map((c) => c.service)).toEqual(['brevo'])
  })

  it('gives each workspace one token limited to its connections, created once then updated', async () => {
    const { state, options } = setup()
    const first = await syncWorkspaceToken(WS, options)
    expect(first.token).toMatch(/^oct_/)
    expect(state.tokens).toHaveLength(1)
    // No connection yet: the token must not fall back to "every connection".
    expect(state.tokens[0].allowedConnections).not.toEqual([])

    await connectWithCredentials(WS, 'brevo', 'api_key', { apiKey: 'a' }, options)
    await connectWithCredentials(OTHER, 'slack', 'api_key', { apiKey: 'b' }, options)
    const second = await syncWorkspaceToken(WS, options)
    expect(second.token).toBeUndefined()
    const ownIds = state.connections.filter((c) => c.connectionName === `ws-${WS}`).map((c) => c.id)
    const wsToken = state.tokens.find((t) => t.name === `workstudio-ws-${WS}`)
    expect(wsToken?.allowedConnections).toEqual(ownIds)
    expect(wsToken?.allowedProxies).toEqual([])
  })

  it('narrows the token again after a disconnection', async () => {
    const { state, options } = setup()
    await connectWithCredentials(WS, 'brevo', 'api_key', { apiKey: 'a' }, options)
    await syncWorkspaceToken(WS, options)
    await disconnect(WS, 'brevo', options)
    await syncWorkspaceToken(WS, options)
    expect(state.connections).toEqual([])
    expect(state.tokens[0].allowedConnections).not.toContain('conn-1')
    expect(state.tokens[0].allowedConnections).not.toEqual([])
  })

  it('starts a named OAuth request for the workspace', async () => {
    const { options } = setup()
    expect(await startOAuth(WS, 'google_calendar', options)).toEqual({
      requestId: 'req-1',
      authorizationUrl: 'https://accounts.example/consent',
    })
  })

  it('reports a key refused by the provider, and an unreachable or misconfigured Connect', async () => {
    const { state, options } = setup()
    state.rejectKeys.add('bad')
    await expect(
      connectWithCredentials(WS, 'brevo', 'api_key', { apiKey: 'bad' }, options)
    ).rejects.toMatchObject({ code: 'credential_invalid' })
    await expect(
      connectWithCredentials(WS, 'brevo', 'api_key', { apiKey: 'bad' }, options)
    ).rejects.toBeInstanceOf(ConnectRefusedError)
    await expect(
      listWorkspaceConnections(WS, {
        ...options,
        config: { ...options.config, adminToken: 'wrong' },
      })
    ).rejects.toBeInstanceOf(ConnectUnavailableError)
    state.down = true
    await expect(listWorkspaceConnections(WS, options)).rejects.toBeInstanceOf(
      ConnectUnavailableError
    )
  })

  it('never puts a secret in an error message', async () => {
    const { state, options } = setup()
    state.rejectKeys.add('xkeysib-secret')
    const error = await connectWithCredentials(
      WS,
      'brevo',
      'api_key',
      { apiKey: 'xkeysib-secret' },
      options
    ).catch((e: Error) => e)
    expect(String(error?.message)).not.toContain('xkeysib-secret')
    expect(String(error?.message)).not.toContain(ADMIN)
  })
})

describe('Nexora Connect catalog and setup', () => {
  it('serves a slim catalog, fetched once and searched locally', async () => {
    const { state, options } = setup()
    const all = await listCatalog({}, options)
    expect(all).toEqual([
      {
        service: 'brevo',
        displayName: 'Brevo',
        description: 'E-mails et SMS',
        categories: ['marketing'],
        authTypes: ['api_key'],
        iconUrl: null,
        homepageUrl: 'https://www.brevo.com',
        actionCount: 42,
      },
      {
        service: 'google_calendar',
        displayName: 'Google Calendar',
        description: '',
        categories: ['productivity'],
        authTypes: ['oauth2'],
        iconUrl: 'https://cdn.example/gcal.svg',
        homepageUrl: null,
        actionCount: 12,
      },
    ])
    expect((await listCatalog({ query: 'cal' }, options)).map((s) => s.service)).toEqual([
      'google_calendar',
    ])
    expect((await listCatalog({ category: 'marketing' }, options)).map((s) => s.service)).toEqual([
      'brevo',
    ])
    expect(state.catalogFetches).toBe(1)
  })

  it('describes a service: its setup fields and its actions without schemas', async () => {
    const { options } = setup()
    const detail = await getServiceDetail('brevo', options)
    expect(detail.auth[0]).toMatchObject({ type: 'api_key' })
    expect(detail.actions).toEqual([
      { id: 'brevo.send_email', name: 'send_email', description: 'Send an e-mail' },
    ])
  })

  it('reads an OAuth request status from the /v1 envelope', async () => {
    const { options } = setup()
    expect(await getOAuthStatus('req-1', options)).toEqual({
      status: 'connected',
      service: 'google_calendar',
      errorMessage: null,
    })
  })

  it('saves an operator OAuth app and returns the callback to register', async () => {
    const { state, options } = setup()
    expect(
      await setOAuthApp('google_calendar', { clientId: 'id', clientSecret: 's' }, options)
    ).toEqual({
      configured: true,
      redirectUri: 'https://connect.pme.fr/oauth/callback',
    })
    expect(state.oauthConfigs.google_calendar).toEqual({ clientId: 'id', clientSecret: 's' })
  })

  it('knows whether a workspace already has its own token', async () => {
    const { options } = setup()
    expect(await hasWorkspaceToken(WS, options)).toBe(false)
    await syncWorkspaceToken(WS, options)
    expect(await hasWorkspaceToken(WS, options)).toBe(true)
  })
})
