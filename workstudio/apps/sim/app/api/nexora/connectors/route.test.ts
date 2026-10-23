import { authMockFns, createSession } from '@sim/testing'
import { createRouteContext } from '@sim/testing/helpers/http'
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
  syncWorkspaceToken: vi.fn(),
  hasWorkspaceToken: vi.fn(),
  applyToken: vi.fn(),
}))

vi.mock('@/lib/workspaces/permissions/utils', () => permissionsMock)
vi.mock('@/lib/nexora/admin-access', () => nexoraAdminAccessMock)
vi.mock('@/lib/nexora/connect', () => ({ applyWorkspaceConnectToken: connect.applyToken }))
vi.mock('@/lib/nexora/connect-admin', () => {
  class ConnectUnavailableError extends Error {}
  class ConnectRefusedError extends Error {
    constructor(readonly code: string) {
      super(code)
    }
  }
  return { ...connect, ConnectUnavailableError, ConnectRefusedError }
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
    connect.hasWorkspaceToken.mockResolvedValue(true)
    connect.syncWorkspaceToken.mockResolvedValue({})
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

  it('gives a workspace created before connectors its own token on first visit by an editor', async () => {
    connect.hasWorkspaceToken.mockResolvedValue(false)
    connect.syncWorkspaceToken.mockResolvedValue({ token: 'oct_new' })
    await GET(req('GET', `/api/nexora/connectors?workspaceId=${WS}`), {})
    expect(connect.syncWorkspaceToken).toHaveBeenCalledWith(WS, { recreate: true })
    expect(connect.applyToken).toHaveBeenCalledWith({ workspaceId: WS, userId: 'u-1' }, 'oct_new')
  })

  it('lets readers browse but not connect', async () => {
    permissionsMockFns.mockGetUserEntityPermissions.mockResolvedValue('read')
    expect((await GET(req('GET', `/api/nexora/connectors?workspaceId=${WS}`), {})).status).toBe(200)
    expect(connect.syncWorkspaceToken).not.toHaveBeenCalled()
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
    expect(connect.syncWorkspaceToken).toHaveBeenCalledWith(WS)
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
    expect(await started.json()).toEqual({ requestId: 'r-1', authorizationUrl: 'https://consent' })
    connect.getOAuthStatus.mockResolvedValue({
      status: 'connected',
      service: 'brevo',
      errorMessage: null,
    })
    const status = await OAUTH_STATUS(
      req('GET', `/api/nexora/connectors/oauth/r-1?workspaceId=${WS}`),
      createRouteContext({ requestId: 'r-1' })
    )
    expect(await status.json()).toEqual({ status: 'connected', errorMessage: null })
    expect(connect.syncWorkspaceToken).toHaveBeenCalledWith(WS)
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
      redirectUri: 'https://connect/oauth/callback',
    })
    const saved = await SET_OAUTH_APP(
      req('PUT', '/api/nexora/connectors/oauth-apps/brevo', { clientId: 'i', clientSecret: 's' }),
      service
    )
    expect(await saved.json()).toEqual({
      configured: true,
      redirectUri: 'https://connect/oauth/callback',
    })
    expect(nexoraAdminAccessMockFns.mockAuthorizeInstanceAdmin).toHaveBeenLastCalledWith({
      requireInstanceOrganization: true,
    })
  })
})
