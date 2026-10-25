import { authMockFns } from '@sim/testing'
import { auditMock, auditMockFns } from '@sim/testing/mocks/audit.mock'
import { instanceOrgMock, instanceOrgMockFns } from '@sim/testing/mocks/instance-org.mock'
import {
  nexoraAdminAccessMock,
  nexoraAdminAccessMockFns,
} from '@sim/testing/mocks/nexora-admin-access.mock'
import {
  nexoraDataProtectionMock,
  nexoraDataProtectionMockFns,
} from '@sim/testing/mocks/nexora-data-protection.mock'
import {
  organizationAuthorizationMock,
  organizationAuthorizationMockFns,
} from '@sim/testing/mocks/organization-authorization.mock'
import { createMockRequest } from '@sim/testing/mocks/request.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockListBudgetWorkspaces, mockExistingWorkspaceIds, mockPiiServiceStatus } = vi.hoisted(
  () => ({
    mockListBudgetWorkspaces: vi.fn(),
    mockExistingWorkspaceIds: vi.fn(),
    mockPiiServiceStatus: vi.fn(),
  })
)

vi.mock('@sim/audit', () => auditMock)
vi.mock('@/lib/nexora/admin-access', () => nexoraAdminAccessMock)
vi.mock('@/lib/organizations/instance-org', () => instanceOrgMock)
vi.mock('@/lib/core/application/organization-authorization', () => organizationAuthorizationMock)
vi.mock('@/lib/nexora/data-protection/policy', () => nexoraDataProtectionMock)
vi.mock('@/lib/nexora/consumption/workspaces', () => ({
  listBudgetWorkspaces: mockListBudgetWorkspaces,
  existingWorkspaceIds: mockExistingWorkspaceIds,
}))
vi.mock('@/lib/nexora/data-protection/service-status', () => ({
  piiServiceStatus: mockPiiServiceStatus,
}))

import { GET, PUT } from '@/app/api/nexora/data-protection/route'

interface Stored {
  defaultMode: 'allow' | 'mask' | 'refuse'
  workspaceModes: Record<string, 'allow' | 'mask' | 'refuse'>
}

/** Stands in for `organization.metadata.nexoraDataProtection` of the instance organization. */
let stored: Stored

function getRequest() {
  return createMockRequest({ method: 'GET', url: '/api/nexora/data-protection' })
}

function putRequest(body: unknown) {
  return createMockRequest({ method: 'PUT', url: '/api/nexora/data-protection', body })
}

describe('/api/nexora/data-protection', () => {
  beforeEach(() => {
    stored = { defaultMode: 'allow', workspaceModes: {} }
    authMockFns.mockGetSession.mockResolvedValue({
      user: { id: 'admin-1' },
      session: { id: 'session-1' },
    })
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
    nexoraDataProtectionMockFns.mockReadDataProtection.mockImplementation(async () => ({
      ...structuredClone(stored),
      organizationId: 'org-instance',
    }))
    nexoraDataProtectionMockFns.mockUpdateDataProtection.mockImplementation(
      async (
        _organizationId: string,
        change: { defaultMode?: Stored['defaultMode']; workspaceModes?: Record<string, never> }
      ) => {
        if (change.defaultMode) stored.defaultMode = change.defaultMode
        for (const [id, mode] of Object.entries(change.workspaceModes ?? {})) {
          if (mode === null) delete stored.workspaceModes[id]
          else stored.workspaceModes[id] = mode
        }
        return structuredClone(stored)
      }
    )
    mockListBudgetWorkspaces.mockResolvedValue([
      { id: 'ws-compta', name: 'Comptabilité', status: 'active' },
      { id: 'ws-ventes', name: 'Ventes', status: 'active' },
    ])
    mockExistingWorkspaceIds.mockImplementation(
      async (ids: string[]) => new Set(ids.filter((id) => id === 'ws-ventes' || id === 'ws-compta'))
    )
    mockPiiServiceStatus.mockResolvedValue({ configured: true, reachable: true })
  })

  it('refuses reading and changing the policy to anyone but an instance admin', async () => {
    nexoraAdminAccessMockFns.mockAuthorizeInstanceAdmin.mockResolvedValue({
      ok: false,
      status: 403,
    })
    expect((await GET(getRequest(), {})).status).toBe(403)
    expect((await PUT(putRequest({ defaultMode: 'refuse' }), {})).status).toBe(403)
    expect(nexoraDataProtectionMockFns.mockUpdateDataProtection).not.toHaveBeenCalled()
    expect(auditMockFns.mockRecordAudit).not.toHaveBeenCalled()
  })

  it('shows the policy, the workspaces to pick from and whether the local service answers', async () => {
    stored = { defaultMode: 'mask', workspaceModes: { 'ws-compta': 'refuse' } }
    mockPiiServiceStatus.mockResolvedValue({ configured: true, reachable: false })
    const response = await GET(getRequest(), {})
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.policy).toEqual({ defaultMode: 'mask', workspaceModes: { 'ws-compta': 'refuse' } })
    expect(body.workspaces.map((ws: { id: string }) => ws.id)).toEqual(['ws-compta', 'ws-ventes'])
    expect(body.service).toEqual({ configured: true, reachable: false })
  })

  it.each([
    ['an unknown mode', { defaultMode: 'ignore' }],
    ['an unknown workspace mode', { workspaceModes: { 'ws-ventes': 'block' } }],
    ['an empty change', {}],
  ])('rejects %s without saving anything', async (_label, body) => {
    const response = await PUT(putRequest(body), {})
    expect(response.status).toBe(400)
    expect(nexoraDataProtectionMockFns.mockUpdateDataProtection).not.toHaveBeenCalled()
    expect(auditMockFns.mockRecordAudit).not.toHaveBeenCalled()
  })

  it('rejects a mode on a workspace that does not exist', async () => {
    const response = await PUT(
      putRequest({ workspaceModes: { 'ws-ventes': 'mask', 'ws-inconnu': 'refuse' } }),
      {}
    )
    expect(response.status).toBe(400)
    expect(nexoraDataProtectionMockFns.mockUpdateDataProtection).not.toHaveBeenCalled()
  })

  it('lets a deleted workspace’s mode be removed', async () => {
    stored.workspaceModes = { 'ws-supprime': 'refuse' }
    const response = await PUT(putRequest({ workspaceModes: { 'ws-supprime': null } }), {})
    expect(response.status).toBe(200)
    expect((await response.json()).policy.workspaceModes).toEqual({})
  })

  it('saves the modes, reads them back, and records who changed what from what', async () => {
    stored = { defaultMode: 'allow', workspaceModes: { 'ws-ventes': 'mask' } }
    const saved = await PUT(
      putRequest({ defaultMode: 'mask', workspaceModes: { 'ws-compta': 'refuse' } }),
      {}
    )
    expect(saved.status).toBe(200)
    const body = await saved.json()
    expect(body.policy).toEqual({
      defaultMode: 'mask',
      workspaceModes: { 'ws-ventes': 'mask', 'ws-compta': 'refuse' },
    })
    expect(body).not.toHaveProperty('previous')

    expect(auditMockFns.mockRecordAudit).toHaveBeenCalledTimes(1)
    expect(auditMockFns.mockRecordAudit.mock.calls[0][0]).toMatchObject({
      actorId: 'admin-1',
      action: 'organization.data_protection.updated',
      resourceType: 'organization',
      resourceId: 'org-instance',
      metadata: {
        change: { defaultMode: 'mask', workspaceModes: { 'ws-compta': 'refuse' } },
        previousDefaultMode: 'allow',
        previousWorkspaceModes: { 'ws-ventes': 'mask' },
      },
    })
  })
})
