import { authMockFns } from '@sim/testing'
import { auditMock } from '@sim/testing/mocks/audit.mock'
import { instanceOrgMock, instanceOrgMockFns } from '@sim/testing/mocks/instance-org.mock'
import {
  nexoraAdminAccessMock,
  nexoraAdminAccessMockFns,
} from '@sim/testing/mocks/nexora-admin-access.mock'
import {
  organizationAuthorizationMock,
  organizationAuthorizationMockFns,
} from '@sim/testing/mocks/organization-authorization.mock'
import { createMockRequest } from '@sim/testing/mocks/request.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockSave, mockRead, mockPurge, mockSendTest } = vi.hoisted(() => ({
  mockSave: vi.fn(),
  mockRead: vi.fn(),
  mockPurge: vi.fn(),
  mockSendTest: vi.fn(),
}))

vi.mock('@sim/audit', () => auditMock)
vi.mock('@/lib/nexora/admin-access', () => nexoraAdminAccessMock)
vi.mock('@/lib/organizations/instance-org', () => instanceOrgMock)
vi.mock('@/lib/core/application/organization-authorization', () => organizationAuthorizationMock)
vi.mock('@/lib/nexora/traces/settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/nexora/traces/settings')>()),
  saveTraceSettings: mockSave,
  readTraceSettings: mockRead,
  loadTraceSettings: mockRead,
}))
vi.mock('@/lib/nexora/traces/purge', () => ({
  purgeTraces: mockPurge,
  purgeConversations: vi.fn(),
}))
vi.mock('@/lib/nexora/traces/otlp', () => ({
  lastExportStatus: () => null,
  sendTestSpan: mockSendTest,
}))

import { POST as purgePost } from '@/app/api/nexora/traces/purge/route'
import { GET, PUT } from '@/app/api/nexora/traces/settings/route'
import { POST as testExportPost } from '@/app/api/nexora/traces/settings/test-export/route'

const presented = {
  enabled: true,
  retentionDays: 30,
  redaction: 'standard',
  conversationRetentionDays: null,
  otlp: { enabled: false, endpoint: '', headers: [] },
}

const call = (method: string, path: string, body?: unknown) =>
  createMockRequest({ method, url: path, body })

describe('trace administration routes', () => {
  beforeEach(() => {
    authMockFns.mockGetSession.mockResolvedValue({ user: { id: 'admin-1' }, session: { id: 's' } })
    nexoraAdminAccessMockFns.mockAuthorizeInstanceAdmin.mockResolvedValue({
      ok: true,
      userId: 'admin-1',
      organizationId: 'org-instance',
    })
    instanceOrgMockFns.mockGetInstanceOrganizationId.mockResolvedValue('org-instance')
    organizationAuthorizationMockFns.mockAuthorizeOrganizationOperation.mockResolvedValue({
      organizationId: 'org-instance',
      userId: 'admin-1',
      role: 'admin',
    })
    mockRead.mockResolvedValue(presented)
    mockSave.mockResolvedValue(presented)
    mockPurge.mockResolvedValue({ deleted: 4 })
    mockSendTest.mockResolvedValue({ ok: true, status: 200 })
  })

  it('refuse à un membre ordinaire la lecture, le changement, l’essai d’export et la purge', async () => {
    nexoraAdminAccessMockFns.mockAuthorizeInstanceAdmin.mockResolvedValue({
      ok: false,
      status: 403,
    })
    const responses = await Promise.all([
      GET(call('GET', '/api/nexora/traces/settings'), {}),
      PUT(call('PUT', '/api/nexora/traces/settings', { retentionDays: 1 }), {}),
      testExportPost(call('POST', '/api/nexora/traces/settings/test-export'), {}),
      purgePost(call('POST', '/api/nexora/traces/purge', {}), {}),
    ])
    expect(responses.map((response) => response.status)).toEqual([403, 403, 403, 403])
    expect(mockSave).not.toHaveBeenCalled()
    expect(mockPurge).not.toHaveBeenCalled()
    expect(mockSendTest).not.toHaveBeenCalled()
  })

  it('refuse un visiteur sans session', async () => {
    nexoraAdminAccessMockFns.mockAuthorizeInstanceAdmin.mockResolvedValue({
      ok: false,
      status: 401,
    })
    expect((await GET(call('GET', '/api/nexora/traces/settings'), {})).status).toBe(401)
  })

  it('lit les réglages et enregistre un changement valide', async () => {
    const read = await GET(call('GET', '/api/nexora/traces/settings'), {})
    expect(read.status).toBe(200)
    expect((await read.json()).settings.retentionDays).toBe(30)

    const saved = await PUT(call('PUT', '/api/nexora/traces/settings', { retentionDays: 7 }), {})
    expect(saved.status).toBe(200)
    expect(mockSave).toHaveBeenCalledWith({ retentionDays: 7 })
  })

  it.each([
    { retentionDays: 0 },
    { retentionDays: 366 },
    { redaction: 'tout' },
    {
      otlp: {
        headers: [
          { name: 'a b', value: 'x' },
          ...Array.from({ length: 10 }, () => ({ name: 'X' })),
        ],
      },
    },
  ])('refuse un changement invalide (%j) avant tout enregistrement', async (body) => {
    const response = await PUT(call('PUT', '/api/nexora/traces/settings', body), {})
    expect(response.status).toBe(400)
    expect(mockSave).not.toHaveBeenCalled()
  })

  it('refuse une horloge simulée sans espace : elle ne purge jamais toute l’instance', async () => {
    const response = await purgePost(
      call('POST', '/api/nexora/traces/purge', { asOf: '2026-12-01T00:00:00.000Z' }),
      {}
    )
    expect(response.status).toBe(400)
    expect(mockPurge).not.toHaveBeenCalled()
  })

  it('purge avec une horloge simulée, limitée à un espace', async () => {
    const response = await purgePost(
      call('POST', '/api/nexora/traces/purge', {
        workspaceId: 'ws-1',
        asOf: '2026-12-01T00:00:00.000Z',
      }),
      {}
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ deletedTraces: 4, retentionDays: 30 })
    expect(mockPurge).toHaveBeenCalledWith({
      now: new Date('2026-12-01T00:00:00.000Z'),
      retentionDays: 30,
      workspaceId: 'ws-1',
    })
  })
})
