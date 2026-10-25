import { authMockFns, createSession } from '@sim/testing'
import { createRouteContext } from '@sim/testing/helpers/http'
import { setEnv } from '@sim/testing/mocks/env.mock'
import { permissionsMock, permissionsMockFns } from '@sim/testing/mocks/permissions.mock'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const connect = vi.hoisted(() => ({
  listCatalog: vi.fn(),
  listWorkspaceConnections: vi.fn(),
  listPersonalConnections: vi.fn(),
  getServiceDetail: vi.fn(),
  connectWithCredentials: vi.fn(),
  connectPersonalWithCredentials: vi.fn(),
  disconnect: vi.fn(),
  disconnectPersonal: vi.fn(),
  startOAuth: vi.fn(),
  startPersonalOAuth: vi.fn(),
  getOAuthStatus: vi.fn(),
  reconcile: vi.fn(),
  forget: vi.fn(),
}))

vi.mock('@/lib/workspaces/permissions/utils', () => permissionsMock)
vi.mock('@/lib/nexora/connect', () => ({ reconcileWorkspaceConnect: connect.reconcile }))
vi.mock('@/lib/nexora/personal-connect', () => ({
  forgetPersonalConnectGrants: connect.forget,
}))
vi.mock('@/lib/nexora/connect-admin', () => {
  class ConnectUnavailableError extends Error {}
  class ConnectRefusedError extends Error {
    constructor(readonly code: string) {
      super(code)
    }
  }
  const { reconcile: _reconcile, forget: _forget, ...client } = connect
  return {
    ...client,
    personalConnectionName: (userId: string) => `u-${userId}`,
    ConnectUnavailableError,
    ConnectRefusedError,
  }
})

import { POST as START_OAUTH } from '@/app/api/nexora/connectors/[service]/oauth/route'
import { DELETE, GET as GET_SERVICE, POST } from '@/app/api/nexora/connectors/[service]/route'
import { GET as OAUTH_STATUS } from '@/app/api/nexora/connectors/oauth/[requestId]/route'
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
const workspaceConnection = { id: 'c-ws', service: 'brevo', authType: 'api_key' }
const personalConnection = { id: 'c-me', service: 'brevo', authType: 'api_key' }

function req(method: string, path: string, body?: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const service = createRouteContext({ service: 'brevo' })

function signIn(userId: string) {
  authMockFns.mockGetSession.mockResolvedValue(
    createSession({ userId, email: `${userId}@pme.fr`, name: userId })
  )
}

describe('Nexora personal connections (scope=personal)', () => {
  beforeEach(() => {
    signIn('alice')
    permissionsMockFns.mockGetUserEntityPermissions.mockResolvedValue('read')
    setEnv({ NEXORA_CONNECT_ADMIN_TOKEN: 'connect-admin-token' })
    connect.listCatalog.mockResolvedValue([brevo])
    connect.listWorkspaceConnections.mockResolvedValue([workspaceConnection])
    connect.listPersonalConnections.mockResolvedValue([])
    connect.connectPersonalWithCredentials.mockResolvedValue(personalConnection)
    connect.disconnectPersonal.mockResolvedValue(undefined)
    connect.getServiceDetail.mockResolvedValue({
      service: brevo,
      auth: [],
      oauthClient: null,
      actions: [],
    })
  })

  it('lets a reader connect, with their own name and without touching the workspace’s connection', async () => {
    const response = await POST(
      req('POST', '/api/nexora/connectors/brevo', {
        workspaceId: WS,
        scope: 'personal',
        authType: 'api_key',
        values: { apiKey: 'alice-secret-key' },
      }),
      service
    )
    const text = await response.text()
    expect(response.status).toBe(200)
    expect(text).not.toContain('alice-secret-key')
    expect(connect.connectPersonalWithCredentials).toHaveBeenCalledWith(
      'alice',
      'brevo',
      'api_key',
      { apiKey: 'alice-secret-key' }
    )
    expect(connect.connectWithCredentials).not.toHaveBeenCalled()
    expect(connect.reconcile).not.toHaveBeenCalled()
    expect(connect.forget).toHaveBeenCalledWith('alice')
  })

  it('still asks for write access to connect the workspace’s own', async () => {
    const response = await POST(
      req('POST', '/api/nexora/connectors/brevo', {
        workspaceId: WS,
        authType: 'api_key',
        values: { apiKey: 'k' },
      }),
      service
    )
    expect(response.status).toBe(403)
  })

  it('refuses a non-member, personal scope included', async () => {
    permissionsMockFns.mockGetUserEntityPermissions.mockResolvedValue(null)
    const response = await POST(
      req('POST', '/api/nexora/connectors/brevo', {
        workspaceId: WS,
        scope: 'personal',
        authType: 'api_key',
        values: { apiKey: 'k' },
      }),
      service
    )
    expect(response.status).toBe(403)
    expect(connect.connectPersonalWithCredentials).not.toHaveBeenCalled()
  })

  it('marks the caller’s own connections in the catalog, never the workspace’s', async () => {
    connect.listPersonalConnections.mockResolvedValue([personalConnection])
    connect.listWorkspaceConnections.mockResolvedValue([
      { id: 'c-ws', service: 'slack', authType: 'api_key' },
    ])
    const body = await (
      await GET(req('GET', `/api/nexora/connectors?workspaceId=${WS}&scope=personal`), {})
    ).json()
    expect(body.connections).toEqual([personalConnection])
    expect(body.services).toEqual([{ ...brevo, connected: true }])
    expect(connect.listPersonalConnections).toHaveBeenCalledWith('alice')
    expect(connect.reconcile).not.toHaveBeenCalled()
  })

  it('shows a service page with the caller’s connection, manageable by a reader', async () => {
    connect.listPersonalConnections.mockResolvedValue([personalConnection])
    const body = await (
      await GET_SERVICE(
        req('GET', `/api/nexora/connectors/brevo?workspaceId=${WS}&scope=personal`),
        service
      )
    ).json()
    expect(body.connection).toEqual(personalConnection)
    expect(body.canManage).toBe(true)
  })

  it('never shows another member’s connection', async () => {
    connect.listPersonalConnections.mockImplementation(async (userId: string) =>
      userId === 'alice' ? [personalConnection] : []
    )
    signIn('bob')
    const body = await (
      await GET_SERVICE(
        req('GET', `/api/nexora/connectors/brevo?workspaceId=${WS}&scope=personal`),
        service
      )
    ).json()
    expect(body.connection).toBeNull()
  })

  it('disconnects the caller’s own connection and forgets its grant', async () => {
    const response = await DELETE(
      req('DELETE', `/api/nexora/connectors/brevo?workspaceId=${WS}&scope=personal`),
      service
    )
    expect(response.status).toBe(200)
    expect(connect.disconnectPersonal).toHaveBeenCalledWith('alice', 'brevo')
    expect(connect.disconnect).not.toHaveBeenCalled()
    expect(connect.forget).toHaveBeenCalledWith('alice')
  })

  it('binds an OAuth request to the member who started it', async () => {
    connect.startPersonalOAuth.mockResolvedValue({
      requestId: 'r-1',
      authorizationUrl: 'https://consent',
    })
    const started = await START_OAUTH(
      req('POST', '/api/nexora/connectors/brevo/oauth', { workspaceId: WS, scope: 'personal' }),
      service
    )
    const { requestId } = await started.json()
    expect(connect.startPersonalOAuth).toHaveBeenCalledWith('alice', 'brevo')

    connect.getOAuthStatus.mockResolvedValue({
      status: 'connected',
      service: 'brevo',
      errorMessage: null,
      errorCode: null,
    })
    const own = await OAUTH_STATUS(
      req('GET', `/api/nexora/connectors/oauth/${requestId}?workspaceId=${WS}&scope=personal`),
      createRouteContext({ requestId })
    )
    expect(own.status).toBe(200)
    expect(connect.forget).toHaveBeenCalledWith('alice')

    signIn('bob')
    connect.getOAuthStatus.mockClear()
    const other = await OAUTH_STATUS(
      req('GET', `/api/nexora/connectors/oauth/${requestId}?workspaceId=${WS}&scope=personal`),
      createRouteContext({ requestId })
    )
    expect(other.status).toBe(404)
    expect(connect.getOAuthStatus).not.toHaveBeenCalled()
  })
})
