import {
  auditMock,
  createMockRequest,
  dbChainMockFns,
  hybridAuthMockFns,
  permissionsMock,
  permissionsMockFns,
  queueTableRows,
  resetDbChainMock,
  schemaMock,
  workflowAuthzMockFns,
  workflowsApiUtilsMock,
  workflowsPersistenceUtilsMock,
  workflowsPersistenceUtilsMockFns,
} from '@sim/testing'
import { createRouteContext } from '@sim/testing/helpers/http'
import {
  permissionGroupScopeMock,
  permissionGroupScopeMockFns,
} from '@sim/testing/mocks/permission-group-scope.mock'
import { telemetryMock } from '@sim/testing/mocks/telemetry.mock'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUserEntityPermissions = permissionsMockFns.mockGetUserEntityPermissions
const mockResolveGroupConfig = permissionGroupScopeMockFns.mockResolvePermissionGroupConfig

vi.mock('@/lib/permission-groups/config-scope.server', () => permissionGroupScopeMock)

vi.mock('@sim/audit', () => auditMock)

vi.mock('@/lib/workspaces/permissions/utils', () => permissionsMock)

vi.mock('@/app/api/workflows/utils', () => workflowsApiUtilsMock)

vi.mock('@/lib/core/telemetry', () => telemetryMock)

vi.mock('@/lib/workflows/defaults', () => ({
  buildDefaultWorkflowArtifacts: vi.fn().mockReturnValue({
    workflowState: { blocks: {}, edges: [], loops: {}, parallels: {} },
    subBlockValues: {},
    startBlockId: 'start-block-id',
  }),
}))

vi.mock('@/lib/workflows/persistence/utils', () => workflowsPersistenceUtilsMock)

import { AuthType, checkSessionOrInternalAuth } from '@/lib/auth/hybrid'
import { DEFAULT_PERMISSION_GROUP_CONFIG } from '@/lib/permission-groups/fields'
import { POST } from '@/app/api/workflows/route'

describe('Workflows API Route - POST ordering', () => {
  afterAll(() => {
    resetDbChainMock()
  })

  beforeEach(() => {
    resetDbChainMock()
    queueTableRows(schemaMock.workspace, [
      { archivedAt: null, forkSyncNewWorkflowsExcluded: false },
    ])

    vi.stubGlobal('crypto', {
      randomUUID: vi.fn().mockReturnValue('workflow-new-id'),
    })

    hybridAuthMockFns.mockCheckSessionOrInternalAuth.mockResolvedValue({
      success: true,
      userId: 'user-123',
      userName: 'Test User',
      userEmail: 'test@example.com',
    })
    mockGetUserEntityPermissions.mockResolvedValue('write')
    mockResolveGroupConfig.mockReset()
    mockResolveGroupConfig.mockResolvedValue(null)
    workflowAuthzMockFns.mockAssertFolderMutable.mockResolvedValue(undefined)
    workflowsPersistenceUtilsMockFns.mockSaveWorkflowToNormalizedTables.mockResolvedValue({
      success: true,
    })
  })

  it('refuses a member whose group withholds workflow editing, creating nothing', async () => {
    vi.mocked(checkSessionOrInternalAuth).mockResolvedValue({
      success: true,
      userId: 'user-123',
      authType: AuthType.SESSION,
    })
    mockResolveGroupConfig.mockResolvedValue({
      ...DEFAULT_PERMISSION_GROUP_CONFIG,
      disableWorkflowEditing: true,
    })

    const response = await POST(
      createMockRequest('POST', { name: 'Relances', workspaceId: 'workspace-123' }),
      createRouteContext({})
    )

    expect(response.status).toBe(403)
    expect((await response.json()).details).toEqual({
      code: 'PERMISSION_GROUP_CAPABILITY_BLOCKED',
    })
    expect(dbChainMockFns.insert).not.toHaveBeenCalled()
  })

  it('rejects creating a workflow inside a locked folder', async () => {
    const { FolderLockedError } = await import('@sim/platform-authz/workflow')
    workflowAuthzMockFns.mockAssertFolderMutable.mockRejectedValueOnce(
      new FolderLockedError('Folder is locked')
    )

    const req = createMockRequest('POST', {
      name: 'New Workflow',
      description: 'desc',
      workspaceId: 'workspace-123',
      folderId: 'locked-folder',
    })

    const response = await POST(req)
    expect(response.status).toBe(423)
    expect(dbChainMockFns.insert).not.toHaveBeenCalled()
  })

  it('uses top insertion against mixed siblings (folders + workflows)', async () => {
    queueTableRows(schemaMock.workflow, [])
    queueTableRows(schemaMock.workflow, [{ minOrder: 5 }])
    queueTableRows(schemaMock.folder, [{ minOrder: 2 }])

    const req = createMockRequest('POST', {
      name: 'New Workflow',
      description: 'desc',
      workspaceId: 'workspace-123',
      folderId: null,
    })

    const response = await POST(req)
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.sortOrder).toBe(1)
    expect(dbChainMockFns.values).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: 1 }))
  })
})
