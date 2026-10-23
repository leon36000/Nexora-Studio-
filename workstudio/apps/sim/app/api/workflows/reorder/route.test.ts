/**
 * Reordering moves workflows between folders, so it is refused to a member whose permission
 * group withholds workflow editing, before any workflow row is touched.
 */
import { createRouteContext } from '@sim/testing/helpers/http'
import {
  permissionGroupScopeMock,
  permissionGroupScopeMockFns,
} from '@sim/testing/mocks/permission-group-scope.mock'
import { permissionsMock, permissionsMockFns } from '@sim/testing/mocks/permissions.mock'
import { createMockRequest } from '@sim/testing/mocks/request.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/permission-groups/config-scope.server', () => permissionGroupScopeMock)
vi.mock('@/lib/workspaces/permissions/utils', () => permissionsMock)

import { db } from '@sim/db'
import { AuthType, checkSessionOrInternalAuth } from '@/lib/auth/hybrid'
import { DEFAULT_PERMISSION_GROUP_CONFIG } from '@/lib/permission-groups/fields'
import { PUT } from '@/app/api/workflows/reorder/route'

describe('PUT /api/workflows/reorder', () => {
  beforeEach(() => {
    vi.mocked(checkSessionOrInternalAuth).mockResolvedValue({
      success: true,
      userId: 'member-1',
      authType: AuthType.SESSION,
    })
    permissionsMockFns.mockGetUserEntityPermissions.mockResolvedValue('write')
    permissionGroupScopeMockFns.mockResolvePermissionGroupConfig.mockReset()
    permissionGroupScopeMockFns.mockResolvePermissionGroupConfig.mockResolvedValue({
      ...DEFAULT_PERMISSION_GROUP_CONFIG,
      disableWorkflowEditing: true,
    })
  })

  it('refuses a writer whose group withholds workflow editing, reading no workflow', async () => {
    const response = await PUT(
      createMockRequest({
        method: 'PUT',
        url: '/api/workflows/reorder',
        body: { workspaceId: 'workspace-1', updates: [{ id: 'workflow-1', sortOrder: 0 }] },
      }),
      createRouteContext({})
    )

    expect(response.status).toBe(403)
    expect(vi.mocked(db.select)).not.toHaveBeenCalled()
    expect(vi.mocked(db.transaction)).not.toHaveBeenCalled()
  })
})
