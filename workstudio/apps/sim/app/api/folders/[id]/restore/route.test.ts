/**
 * Restoring a workflow folder brings its workflows back, so it is refused to a member whose
 * permission group withholds workflow editing, while other resource folders stay untouched.
 */

import { createRouteContext } from '@sim/testing/helpers/http'
import { authMockFns } from '@sim/testing/mocks/auth.mock'
import {
  foldersOrchestrationMock,
  foldersOrchestrationMockFns,
} from '@sim/testing/mocks/folders-orchestration.mock'
import {
  permissionGroupScopeMock,
  permissionGroupScopeMockFns,
} from '@sim/testing/mocks/permission-group-scope.mock'
import { permissionsMock, permissionsMockFns } from '@sim/testing/mocks/permissions.mock'
import { posthogServerMock } from '@sim/testing/mocks/posthog-server.mock'
import { createMockRequest } from '@sim/testing/mocks/request.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/folders/orchestration', () => foldersOrchestrationMock)
vi.mock('@/lib/permission-groups/config-scope.server', () => permissionGroupScopeMock)
vi.mock('@/lib/workspaces/permissions/utils', () => permissionsMock)
vi.mock('@/lib/posthog/server', () => posthogServerMock)

import { DEFAULT_PERMISSION_GROUP_CONFIG } from '@/lib/permission-groups/fields'
import { POST } from '@/app/api/folders/[id]/restore/route'

const mockRestoreFolder = foldersOrchestrationMockFns.mockRestoreFolder

function restore(resourceType: 'workflow' | 'table') {
  return POST(
    createMockRequest({
      method: 'POST',
      url: '/api/folders/folder-1/restore',
      body: { workspaceId: 'workspace-1', resourceType },
    }),
    createRouteContext({ id: 'folder-1' })
  )
}

describe('POST /api/folders/[id]/restore', () => {
  beforeEach(() => {
    authMockFns.mockGetSession.mockResolvedValue({ user: { id: 'member-1' } })
    permissionsMockFns.mockGetUserEntityPermissions.mockResolvedValue('write')
    mockRestoreFolder.mockResolvedValue({ success: true, restoredItems: { folders: 1 } })
    permissionGroupScopeMockFns.mockResolvePermissionGroupConfig.mockReset()
    permissionGroupScopeMockFns.mockResolvePermissionGroupConfig.mockResolvedValue({
      ...DEFAULT_PERMISSION_GROUP_CONFIG,
      disableWorkflowEditing: true,
    })
  })

  it('refuses restoring a workflow folder to a member whose group withholds editing', async () => {
    const response = await restore('workflow')

    expect(response.status).toBe(403)
    expect(mockRestoreFolder).not.toHaveBeenCalled()
  })

  it('still restores a table folder for that member', async () => {
    const response = await restore('table')

    expect(response.status).toBe(200)
    expect(mockRestoreFolder).toHaveBeenCalledTimes(1)
  })
})
