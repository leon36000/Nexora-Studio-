import { authMockFns, createSession } from '@sim/testing'
import { createRouteContext } from '@sim/testing/helpers/http'
import { setEnv } from '@sim/testing/mocks/env.mock'
import { getMockLogger } from '@sim/testing/mocks/logger.mock'
import {
  nexoraAdminAccessMock,
  nexoraAdminAccessMockFns,
} from '@sim/testing/mocks/nexora-admin-access.mock'
import { permissionsMock, permissionsMockFns } from '@sim/testing/mocks/permissions.mock'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const connect = vi.hoisted(() => ({
  listCatalog: vi.fn(),
  listWorkspaceConnections: vi.fn(),
  getServiceDetail: vi.fn(),
  connectWithCredentials: vi.fn(),
  disconnect: vi.fn(),
  startOAuth: vi.fn(),
  getOAuthStatus: vi.fn(),
  setOAuthApp: vi.fn(),
  reconcile: vi.fn(),
}))

vi.mock('@/lib/workspaces/permissions/utils', () => permissionsMock)
vi.mock('@/lib/nexora/admin-access', () => nexoraAdminAccessMock)
vi.mock('@/lib/nexora/connect', () => ({ reconcileWorkspaceConnect: connect.reconcile }))
vi.mock('@/lib/nexora/connect-admin', () => {
  class ConnectUnavailableError extends Error {}
  class ConnectRefusedError extends Error {
    constructor(readonly code: string) {
      super(code)
    }
  }
  const { reconcile: _reconcile, ...client } = connect
  return { ...client, ConnectUnavailableError, ConnectRefusedError }
})

import { ConnectRefusedError, ConnectUnavailableError } from '@/lib/nexora/connect-admin'
import { POST as START_OAUTH } from '@/app/api/nexora/connectors/[service]/oauth/route'
import { DELETE, GET as GET_SERVICE, POST } from '@/app/api/nexora/connectors/[service]/route'
import { GET as OAUTH_STATUS } from '@/app/api/nexora/connectors/oauth/[requestId]/route'
import { PUT as SET_OAUTH_APP } from '@/app/api/nexora/connectors/oauth-apps/[service]/route'
import { GET } from '@/app/api/nexora/connectors/route'

const WS = 'ws-a'
const brevo = {
  service: 'brevo',
  displayName: 'Brevo',
  description: '',
  categories: ['marketing'],
  authTypes: ['api_key'],
  iconUrl: null,
  homepageUrl: null,
  actionCount: 42,
}

function req(method: string, path: string, body?: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const service = createRouteContext({ service: 'brevo' })

describe('Nexora connectors routes', () => {
  beforeEach(() => {
    authMockFns.mockGetSession.mockResolvedValue(
      createSession({ userId: 'u-1', email: 'a@pme.fr', name: 'A' })
    )
    permissionsMockFns.mockGetUserEntityPermissions.mockResolvedValue('write')
    connect.listCatalog.mockResolvedValue([brevo])
    connect.listWorkspaceConnections.mockResolvedValue([
      { id: 'c-1', service: 'brevo', authType: 'api_key' },
    ])
    connect.reconcile.mockResolvedValue([{ id: 'c-1', service: 'brevo', authType: 'api_key' }])
    setEnv({ NEXORA_CONNECT_ADMIN_TOKEN: 'connect-admin-token' })
    connect.connectWithCredentials.mockResolvedValue({
      id: 'c-1',
      service: 'brevo',
      authType: 'api_key',
    })
    connect.disconnect.mockResolvedValue(undefined)
  })

  it('requires a session and membership of the workspace, without touching Connect', async () => {
    authMockFns.mockGetSession.mockResolvedValueOnce(null)
    expect((await GET(req('GET', `/api/nexora/connectors?workspaceId=${WS}`), {})).status).toBe(401)
    permissionsMockFns.mockGetUserEntityPermissions.mockResolvedValue(null)
    expect((await GET(req('GET', `/api/nexora/connectors?workspaceId=${WS}`), {})).status).toBe(403)
    expect(
      (await GET_SERVICE(req('GET', `/api/nexora/connectors/brevo?workspaceId=${WS}`), service))
        .status
    ).toBe(403)
    expect(connect.listCatalog).not.toHaveBeenCalled()
    expect(connect.getServiceDetail).not.toHaveBeenCalled()
  })

  it('marks the workspace’s connected services in the catalog', async () => {
    const body = await (
      await GET(req('GET', `/api/nexora/connectors?workspaceId=${WS}&q=bre`), {})
    ).json()
    expect(body.services).toEqual([{ ...brevo, connected: true }])
    expect(body.categories).toEqual(['marketing'])
    expect(connect.listCatalog).toHaveBeenCalledWith({ query: 'bre', category: undefined })
  })

  it('isolates the workspace on any member’s visit of the catalog, a reader’s included', async () => {
    permissionsMockFns.mockGetUserEntityPermissions.mockResolvedValue('read')
    const body = await (
      await GET(req('GET', `/api/nexora/connectors?workspaceId=${WS}`), {})
    ).json()
    expect(connect.reconcile).toHaveBeenCalledWith({ workspaceId: WS, userId: 'u-1' })
    expect(body.connections).toEqual([{ id: 'c-1', service: 'brevo', authType: 'api_key' }])
  })

  it('reconciles the workspace token on a service page visit', async () => {
    permissionsMockFns.mockGetUserEntityPermissions.mockResolvedValue('read')
    connect.getServiceDetail.mockResolvedValue({
      service: brevo,
      auth: [],
      oauthClient: null,
      actions: [],
    })
    const response = await GET_SERVICE(
      req('GET', `/api/nexora/connectors/brevo?workspaceId=${WS}`),
      service
    )
    expect(response.status).toBe(200)
    expect(connect.reconcile).toHaveBeenCalledWith({ workspaceId: WS, userId: 'u-1' })
    expect((await response.json()).connection).toEqual({
      id: 'c-1',
      service: 'brevo',
      authType: 'api_key',
    })
  })

  it('still shows the catalog when the workspace token cannot be reconciled', async () => {
    connect.reconcile.mockRejectedValue(new Error('database unavailable'))
    const response = await GET(req('GET', `/api/nexora/connectors?workspaceId=${WS}`), {})
    expect(response.status).toBe(200)
    expect((await response.json()).services).toEqual([{ ...brevo, connected: true }])
  })

  it('lets readers browse but not connect', async () => {
    permissionsMockFns.mockGetUserEntityPermissions.mockResolvedValue('read')
    expect((await GET(req('GET', `/api/nexora/connectors?workspaceId=${WS}`), {})).status).toBe(200)
    const post = await POST(
      req('POST', '/api/nexora/connectors/brevo', {
        workspaceId: WS,
        authType: 'api_key',
        values: { apiKey: 'k' },
      }),
      service
    )
    expect(post.status).toBe(403)
    const del = await DELETE(
      req('DELETE', `/api/nexora/connectors/brevo?workspaceId=${WS}`),
      service
    )
    expect(del.status).toBe(403)
    expect(connect.connectWithCredentials).not.toHaveBeenCalled()
    expect(connect.disconnect).not.toHaveBeenCalled()
  })

  it('connects with a key, then narrows the workspace token to its connections', async () => {
    const response = await POST(
      req('POST', '/api/nexora/connectors/brevo', {
        workspaceId: WS,
        authType: 'api_key',
        values: { apiKey: 'xkeysib-secret' },
      }),
      service
    )
    const text = await response.text()
    expect(JSON.parse(text)).toEqual({
      connection: { id: 'c-1', service: 'brevo', authType: 'api_key' },
    })
    expect(text).not.toContain('xkeysib-secret')
    expect(connect.connectWithCredentials).toHaveBeenCalledWith(WS, 'brevo', 'api_key', {
      apiKey: 'xkeysib-secret',
    })
    expect(connect.reconcile).toHaveBeenCalledWith({ workspaceId: WS, userId: 'u-1' })
  })

  it('reports a refused key, a replaced OAuth request and an unavailable Connect as codes', async () => {
    const cases: [Error, number, string][] = [
      [new ConnectRefusedError('credential_invalid'), 400, 'refused'],
      [new ConnectRefusedError('request_superseded'), 409, 'superseded'],
      [new ConnectUnavailableError('down'), 503, 'unavailable'],
    ]
    for (const [error, status, code] of cases) {
      connect.connectWithCredentials.mockRejectedValueOnce(error)
      const response = await POST(
        req('POST', '/api/nexora/connectors/brevo', {
          workspaceId: WS,
          authType: 'api_key',
          values: { apiKey: 'k' },
        }),
        service
      )
      expect([response.status, (await response.json()).error]).toEqual([status, code])
    }
  })

  it('refuses a hostile service id before calling Connect', async () => {
    const response = await GET_SERVICE(
      req('GET', `/api/nexora/connectors/..%2Fadmin?workspaceId=${WS}`),
      createRouteContext({ service: '../admin' })
    )
    expect(response.status).toBe(400)
    expect(connect.getServiceDetail).not.toHaveBeenCalled()
  })

  it('starts OAuth for editors and refreshes the token once connected', async () => {
    connect.startOAuth.mockResolvedValue({ requestId: 'r-1', authorizationUrl: 'https://consent' })
    const started = await START_OAUTH(
      req('POST', '/api/nexora/connectors/brevo/oauth', { workspaceId: WS }),
      service
    )
    const { requestId, authorizationUrl } = await started.json()
    expect(authorizationUrl).toBe('https://consent')
    connect.getOAuthStatus.mockResolvedValue({
      status: 'connected',
      service: 'brevo',
      errorMessage: null,
      errorCode: null,
    })
    const status = await OAUTH_STATUS(
      req('GET', `/api/nexora/connectors/oauth/${requestId}?workspaceId=${WS}`),
      createRouteContext({ requestId })
    )
    expect(await status.json()).toEqual({
      status: 'connected',
      errorMessage: null,
      errorCode: null,
    })
    expect(connect.getOAuthStatus).toHaveBeenCalledWith('r-1')
    expect(connect.reconcile).toHaveBeenCalledWith({ workspaceId: WS, userId: 'u-1' })
  })

  it('never reports an OAuth request to another workspace, nor a forged one', async () => {
    connect.startOAuth.mockResolvedValue({ requestId: 'r-1', authorizationUrl: 'https://consent' })
    const started = await START_OAUTH(
      req('POST', '/api/nexora/connectors/brevo/oauth', { workspaceId: WS }),
      service
    )
    const { requestId } = await started.json()
    const otherWorkspace = await OAUTH_STATUS(
      req('GET', `/api/nexora/connectors/oauth/${requestId}?workspaceId=ws-b`),
      createRouteContext({ requestId })
    )
    expect(otherWorkspace.status).toBe(404)
    const forged = `r-1.${'0'.repeat(64)}`
    const forgedStatus = await OAUTH_STATUS(
      req('GET', `/api/nexora/connectors/oauth/${forged}?workspaceId=${WS}`),
      createRouteContext({ requestId: forged })
    )
    expect(forgedStatus.status).toBe(404)
    expect(connect.getOAuthStatus).not.toHaveBeenCalled()
    expect(connect.reconcile).not.toHaveBeenCalled()
  })

  it('shows OAuth as unavailable while Nexora Connect has no public address', async () => {
    connect.getServiceDetail.mockResolvedValue({
      service: brevo,
      auth: [{ type: 'oauth2' }],
      oauthClient: {
        configured: true,
        expectedRedirectUri: 'http://localhost:8400/oauth/callback',
      },
      actions: [],
    })
    const local = await (
      await GET_SERVICE(req('GET', `/api/nexora/connectors/brevo?workspaceId=${WS}`), service)
    ).json()
    expect(local.oauth).toEqual({ configured: true, available: false, redirectUri: null })

    connect.getServiceDetail.mockResolvedValue({
      service: brevo,
      auth: [{ type: 'oauth2' }],
      oauthClient: {
        configured: true,
        expectedRedirectUri: 'https://connect.pme.fr/oauth/callback',
      },
      actions: [],
    })
    const public_ = await (
      await GET_SERVICE(req('GET', `/api/nexora/connectors/brevo?workspaceId=${WS}`), service)
    ).json()
    expect(public_.oauth).toEqual({
      configured: true,
      available: true,
      redirectUri: 'https://connect.pme.fr/oauth/callback',
    })
  })

  it('keeps an unavailable Connect’s detail in the server logs, not in the answer', async () => {
    connect.listCatalog.mockRejectedValueOnce(
      new ConnectUnavailableError('GET /api/providers answered HTTP 502')
    )
    const response = await GET(req('GET', `/api/nexora/connectors?workspaceId=${WS}`), {})
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'unavailable' })
    expect(getMockLogger('NexoraConnectors').warn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ detail: expect.stringContaining('HTTP 502') })
    )
  })

  it('lets only instance admins set an operator OAuth application', async () => {
    nexoraAdminAccessMockFns.mockAuthorizeInstanceAdmin.mockResolvedValueOnce({
      ok: false,
      status: 403,
    })
    const denied = await SET_OAUTH_APP(
      req('PUT', '/api/nexora/connectors/oauth-apps/brevo', { clientId: 'i', clientSecret: 's' }),
      service
    )
    expect(denied.status).toBe(403)
    expect(connect.setOAuthApp).not.toHaveBeenCalled()
    nexoraAdminAccessMockFns.mockAuthorizeInstanceAdmin.mockResolvedValueOnce({
      ok: true,
      userId: 'u-1',
      organizationId: 'o',
    })
    connect.setOAuthApp.mockResolvedValue({
      configured: true,
      redirectUri: 'https://connect.pme.fr/oauth/callback',
    })
    const saved = await SET_OAUTH_APP(
      req('PUT', '/api/nexora/connectors/oauth-apps/brevo', { clientId: 'i', clientSecret: 's' }),
      service
    )
    expect(await saved.json()).toEqual({
      configured: true,
      redirectUri: 'https://connect.pme.fr/oauth/callback',
    })
    expect(nexoraAdminAccessMockFns.mockAuthorizeInstanceAdmin).toHaveBeenLastCalledWith({
      requireInstanceOrganization: true,
    })
  })

  it('does not offer a loopback callback address to register with a provider', async () => {
    nexoraAdminAccessMockFns.mockAuthorizeInstanceAdmin.mockResolvedValueOnce({
      ok: true,
      userId: 'u-1',
      organizationId: 'o',
    })
    connect.setOAuthApp.mockResolvedValue({
      configured: true,
      redirectUri: 'http://localhost:8400/oauth/callback',
    })
    const saved = await SET_OAUTH_APP(
      req('PUT', '/api/nexora/connectors/oauth-apps/brevo', { clientId: 'i', clientSecret: 's' }),
      service
    )
    expect(await saved.json()).toEqual({ configured: true, redirectUri: null })
  })
})
