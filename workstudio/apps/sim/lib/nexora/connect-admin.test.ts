import { jsonResponse } from '@sim/testing/helpers/http'
import { describe, expect, it } from 'vitest'
import { type IsolationDependencies, reconcileWorkspaceConnect } from '@/lib/nexora/connect'
import {
  ConnectRefusedError,
  ConnectUnavailableError,
  connectPersonalWithCredentials,
  connectWithCredentials,
  disconnect,
  disconnectPersonal,
  getActionOperationType,
  getOAuthStatus,
  getServiceDetail,
  listCatalog,
  listPersonalConnections,
  listWorkspaceConnections,
  personalConnectionName,
  removeWorkspaceFromConnect,
  revokePersonalToken,
  revokeWorkspaceToken,
  setOAuthApp,
  startOAuth,
  syncPersonalToken,
  syncWorkspaceToken,
  workspaceConnectionName,
} from '@/lib/nexora/connect-admin'
import { catalogCategoryKey, distinctCatalogCategories } from '@/lib/nexora/connect-categories'

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
    tokenUpdates: 0,
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
    if (setupMatch && !CATALOG.some((p) => p.service === setupMatch[1])) {
      return jsonResponse(
        { success: false, errorCode: 'unknown_service', message: 'Unknown service' },
        404
      )
    }
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
      const found = state.connections.some(
        (c) => c.service === connectionMatch[1] && c.connectionName === body.connectionName
      )
      if (!found) {
        return jsonResponse({ error: { code: 'connection_not_found', message: 'gone' } }, 404)
      }
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
      state.tokenUpdates++
      Object.assign(token, body)
      return jsonResponse(token)
    }
    if (tokenMatch && method === 'DELETE') {
      state.tokens = state.tokens.filter((t) => t.id !== tokenMatch[1])
      return jsonResponse({ revoked: true })
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
    const message = await connectWithCredentials(
      WS,
      'brevo',
      'api_key',
      { apiKey: 'xkeysib-secret' },
      options
    ).then(
      () => '',
      (e: Error) => e.message
    )
    expect(message).toContain('credential_invalid')
    expect(message).not.toContain('xkeysib-secret')
    expect(message).not.toContain(ADMIN)
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

  it('counts one category for the spellings Connect gives it, and filters by any of them', async () => {
    expect(catalogCategoryKey('Cross-border E-commerce')).toBe(
      catalogCategoryKey('CrossBorderE-commerce')
    )
    expect(
      distinctCatalogCategories([
        'Cross-border E-commerce',
        'Marketing',
        'Cross Border E-commerce',
        'Cross-Border E-Commerce',
      ])
    ).toEqual(['Cross-border E-commerce', 'Marketing'])
    const { options } = setup()
    expect((await listCatalog({ category: 'Marketing' }, options)).map((s) => s.service)).toEqual([
      'brevo',
    ])
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
      errorCode: null,
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
})

describe('Nexora Connect workspace token upkeep', () => {
  const tokensOf = (state: ReturnType<typeof setup>['state'], workspaceId: string) =>
    state.tokens.filter((t) => t.name === `workstudio-ws-${workspaceId}`)

  it('leaves a token already limited to exactly the workspace connections untouched', async () => {
    const { state, options } = setup()
    await syncWorkspaceToken(WS, options)
    await syncWorkspaceToken(WS, options)
    expect(state.tokenUpdates).toBe(0)
    await connectWithCredentials(WS, 'brevo', 'api_key', { apiKey: 'a' }, options)
    await syncWorkspaceToken(WS, options)
    await syncWorkspaceToken(WS, options)
    expect(state.tokenUpdates).toBe(1)
  })

  it('returns the connections the token now grants', async () => {
    const { options } = setup()
    await connectWithCredentials(WS, 'brevo', 'api_key', { apiKey: 'a' }, options)
    const { connections } = await syncWorkspaceToken(WS, options)
    expect(connections.map((c) => c.service)).toEqual(['brevo'])
  })

  it('replaces duplicate tokens of a workspace by one fresh token', async () => {
    const { state, options } = setup()
    const policy = {
      allowedActions: [],
      blockedActions: [],
      allowedProxies: [],
      allowedConnections: ['nexora-no-connection'],
      allowedTriggers: [],
    }
    state.tokens.push(
      { id: 'dup-1', name: `workstudio-ws-${WS}`, ...policy },
      { id: 'dup-2', name: `workstudio-ws-${WS}`, ...policy },
      { id: 'other', name: `workstudio-ws-${OTHER}`, ...policy }
    )
    const { token } = await syncWorkspaceToken(WS, options)
    expect(token).toMatch(/^oct_/)
    expect(tokensOf(state, WS)).toHaveLength(1)
    expect(tokensOf(state, WS)[0].id).not.toMatch(/^dup-/)
    expect(tokensOf(state, OTHER)).toHaveLength(1)
  })

  it('revokes every token of a workspace', async () => {
    const { state, options } = setup()
    await syncWorkspaceToken(WS, options)
    await syncWorkspaceToken(OTHER, options)
    await revokeWorkspaceToken(WS, options)
    expect(tokensOf(state, WS)).toEqual([])
    expect(tokensOf(state, OTHER)).toHaveLength(1)
  })

  it('removes a deleted workspace’s connections and token, and nothing of other workspaces', async () => {
    const { state, options } = setup()
    await connectWithCredentials(WS, 'brevo', 'api_key', { apiKey: 'a' }, options)
    await connectWithCredentials(WS, 'slack', 'api_key', { apiKey: 'b' }, options)
    await connectWithCredentials(OTHER, 'brevo', 'api_key', { apiKey: 'c' }, options)
    await syncWorkspaceToken(WS, options)
    await syncWorkspaceToken(OTHER, options)
    await removeWorkspaceFromConnect(WS, options)
    expect(state.connections.map((c) => c.connectionName)).toEqual([`ws-${OTHER}`])
    expect(tokensOf(state, WS)).toEqual([])
    expect(tokensOf(state, OTHER)).toHaveLength(1)
  })

  it('treats disconnecting a connection that is already gone as done', async () => {
    const { options } = setup()
    await expect(disconnect(WS, 'brevo', options)).resolves.toBeUndefined()
  })

  it('reports a service Connect does not know as missing, not as a refusal', async () => {
    const { options } = setup()
    expect(await getServiceDetail('ghost', options)).toEqual({
      service: null,
      auth: [],
      oauthClient: null,
      actions: [],
    })
  })
})

/** Runs work for one key at a time, in arrival order, as the per-workspace database lock does. */
function keyedLock(): IsolationDependencies['lock'] {
  const tails = new Map<string, Promise<unknown>>()
  return (key, work) => {
    const run = (tails.get(key) ?? Promise.resolve()).then(work, work)
    tails.set(
      key,
      run.catch(() => undefined)
    )
    return run
  }
}

describe('concurrent token upkeep of one workspace', () => {
  function isolation(connect: ReturnType<typeof setup>, lock: IsolationDependencies['lock']) {
    let server: { id: string; headers: Record<string, string> } | null = null
    const deps: IsolationDependencies = {
      lock,
      findServer: async () => server,
      syncToken: (workspaceId, options) =>
        syncWorkspaceToken(workspaceId, { ...connect.options, ...options }),
      revokeToken: (workspaceId) => revokeWorkspaceToken(workspaceId, connect.options),
      writeServer: async ({ token }) => {
        server = { id: 'srv', headers: { Authorization: `Bearer ${token}` } }
      },
    }
    return { deps, server: () => server }
  }

  it('leaves the workspace exactly one token, the one its server holds', async () => {
    const connect = setup()
    const { deps, server } = isolation(connect, keyedLock())
    const workspace = { workspaceId: WS, userId: 'u-1' }
    await Promise.all([
      reconcileWorkspaceConnect(workspace, deps),
      reconcileWorkspaceConnect(workspace, deps),
      reconcileWorkspaceConnect(workspace, deps),
    ])
    const tokens = connect.state.tokens.filter((t) => t.name === `workstudio-ws-${WS}`)
    expect(tokens).toHaveLength(1)
    expect(server()?.headers.Authorization).toBe(`Bearer oct_secret_${tokens[0].id}`)
  })
})

describe('getActionOperationType', () => {
  const config = { baseUrl: 'http://connect.test', adminToken: ADMIN }

  it('reads what Nexora Connect says an action does, and keeps the answer for a while', async () => {
    const asked: string[] = []
    const fetchFn = (async (input: RequestInfo | URL) => {
      asked.push(String(input))
      return jsonResponse({ id: 'postmark.send_email', operationType: 'write' })
    }) as typeof fetch
    expect(await getActionOperationType('postmark.send_email', { config, fetchFn })).toBe('write')
    expect(await getActionOperationType('postmark.send_email', { config, fetchFn })).toBe('write')
    expect(asked).toEqual(['http://connect.test/api/actions/postmark.send_email'])
  })

  it('answers null for an action Connect does not know, and throws when Connect is unreachable', async () => {
    const unknown = (async () =>
      jsonResponse({ error: { code: 'not_found' } }, 404)) as typeof fetch
    expect(await getActionOperationType('inconnue.action', { config, fetchFn: unknown })).toBeNull()
    const down = (async () => jsonResponse({}, 502)) as typeof fetch
    await expect(
      getActionOperationType('autre.action', { config, fetchFn: down })
    ).rejects.toBeInstanceOf(ConnectUnavailableError)
  })

  it('does not call Connect for an action id that is not an identifier', async () => {
    const fetchFn = (async () => {
      throw new Error('should not be called')
    }) as typeof fetch
    expect(await getActionOperationType('../admin/tokens', { config, fetchFn })).toBeNull()
  })
})

describe('Nexora Connect personal connections', () => {
  const ALICE = 'user-alice-0001'
  const BOB = 'user-bob-0002'

  it('names a member’s connection u-<userId>, within Connect’s naming rule', () => {
    expect(personalConnectionName(ALICE)).toBe(`u-${ALICE}`)
    expect(personalConnectionName('3f2b8c1e-5a47-4b1d-9c0e-7d6a1e2f3b4c')).toMatch(
      /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/
    )
  })

  it('lists, connects and disconnects only the member’s own connections', async () => {
    const { state, options } = setup()
    await connectPersonalWithCredentials(ALICE, 'brevo', 'api_key', { apiKey: 'a' }, options)
    await connectPersonalWithCredentials(BOB, 'brevo', 'api_key', { apiKey: 'b' }, options)
    await connectWithCredentials(WS, 'slack', 'api_key', { apiKey: 'c' }, options)
    expect(state.connections.map((c) => c.connectionName)).toEqual([
      `u-${ALICE}`,
      `u-${BOB}`,
      `ws-${WS}`,
    ])
    expect((await listPersonalConnections(ALICE, options)).map((c) => c.service)).toEqual(['brevo'])
    expect(await listWorkspaceConnections(WS, options)).toHaveLength(1)

    await disconnectPersonal(ALICE, 'brevo', options)
    expect(await listPersonalConnections(ALICE, options)).toEqual([])
    expect(await listPersonalConnections(BOB, options)).toHaveLength(1)
    await expect(disconnectPersonal(ALICE, 'brevo', options)).resolves.toBeUndefined()
  })

  it('grants a member their connections, and the workspace’s only for services they did not connect', async () => {
    const { state, options } = setup()
    await connectPersonalWithCredentials(ALICE, 'brevo', 'api_key', { apiKey: 'a' }, options)
    await connectWithCredentials(WS, 'brevo', 'api_key', { apiKey: 'w1' }, options)
    await connectWithCredentials(WS, 'slack', 'api_key', { apiKey: 'w2' }, options)
    await connectPersonalWithCredentials(BOB, 'slack', 'api_key', { apiKey: 'b' }, options)
    const id = (name: string, service: string) =>
      state.connections.find((c) => c.connectionName === name && c.service === service)?.id

    const synced = await syncPersonalToken({ userId: ALICE, workspaceId: WS }, options)
    expect(synced.token).toMatch(/^oct_/)
    const token = state.tokens.find((t) => t.id === synced.tokenId)
    expect(token?.name).toBe(`workstudio-u-${ALICE}-w-${WS}`)
    // Alice's own brevo wins over the workspace's brevo; the workspace's slack stays reachable.
    expect([...(token?.allowedConnections ?? [])].sort()).toEqual(
      [id(`u-${ALICE}`, 'brevo'), id(`ws-${WS}`, 'slack')].sort()
    )
    expect(token?.allowedConnections).not.toContain(id(`u-${BOB}`, 'slack'))
    expect(token?.allowedConnections).not.toContain(id(`ws-${WS}`, 'brevo'))
  })

  it('updates the same token when the grant changes and keeps the secret out of the second answer', async () => {
    const { state, options } = setup()
    await connectPersonalWithCredentials(ALICE, 'brevo', 'api_key', { apiKey: 'a' }, options)
    const first = await syncPersonalToken({ userId: ALICE, workspaceId: WS }, options)
    const unchanged = await syncPersonalToken(
      { userId: ALICE, workspaceId: WS, existingTokenId: first.tokenId },
      options
    )
    expect(unchanged).toMatchObject({ tokenId: first.tokenId, grantHash: first.grantHash })
    expect(unchanged.token).toBeUndefined()
    expect(state.tokenUpdates).toBe(0)

    await connectWithCredentials(WS, 'slack', 'api_key', { apiKey: 'w' }, options)
    const changed = await syncPersonalToken(
      { userId: ALICE, workspaceId: WS, existingTokenId: first.tokenId },
      options
    )
    expect(changed.tokenId).toBe(first.tokenId)
    expect(changed.token).toBeUndefined()
    expect(changed.grantHash).not.toBe(first.grantHash)
    expect(state.tokenUpdates).toBe(1)
    expect(state.tokens).toHaveLength(1)
  })

  it('makes a fresh token when the stored one no longer exists in Connect', async () => {
    const { state, options } = setup()
    await connectPersonalWithCredentials(ALICE, 'brevo', 'api_key', { apiKey: 'a' }, options)
    const first = await syncPersonalToken({ userId: ALICE, workspaceId: WS }, options)
    state.tokens = []
    const again = await syncPersonalToken(
      { userId: ALICE, workspaceId: WS, existingTokenId: first.tokenId },
      options
    )
    expect(again.token).toMatch(/^oct_/)
    expect(again.tokenId).not.toBe(first.tokenId)
  })

  it('never grants every connection: a member with nothing gets the no-connection sentinel', async () => {
    const { state, options } = setup()
    await syncPersonalToken({ userId: ALICE, workspaceId: WS }, options)
    expect(state.tokens[0].allowedConnections).toEqual(['nexora-no-connection'])
  })

  it('revokes a personal token', async () => {
    const { state, options } = setup()
    const synced = await syncPersonalToken({ userId: ALICE, workspaceId: WS }, options)
    await revokePersonalToken(synced.tokenId, options)
    expect(state.tokens).toEqual([])
  })

  it('never puts a key or a token in an error message', async () => {
    const { state, options } = setup()
    state.rejectKeys.add('alice-secret-key')
    const message = await connectPersonalWithCredentials(
      ALICE,
      'brevo',
      'api_key',
      { apiKey: 'alice-secret-key' },
      options
    ).then(
      () => '',
      (error: Error) => error.message
    )
    expect(message).not.toContain('alice-secret-key')
    state.down = true
    const unreachable = await syncPersonalToken({ userId: ALICE, workspaceId: WS }, options).then(
      () => '',
      (error: Error) => error.message
    )
    expect(unreachable).not.toMatch(/oct_/)
  })
})
