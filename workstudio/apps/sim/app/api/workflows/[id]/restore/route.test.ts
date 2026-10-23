/**
 * Restoring a deleted workflow writes it back into the workspace, so a member whose permission
 * group withholds workflow editing is refused here as on every other editing door.
 */
import { createRouteContext } from '@sim/testing/helpers/http'
import {
  permissionGroupScopeMock,
  permissionGroupScopeMockFns,
} from '@sim/testing/mocks/permission-group-scope.mock'
import { permissionsMock, permissionsMockFns } from '@sim/testing/mocks/permissions.mock'
import { posthogServerMock } from '@sim/testing/mocks/posthog-server.mock'
import { createMockRequest } from '@sim/testing/mocks/request.mock'
import {
  workflowsOrchestrationMock,
  workflowsOrchestrationMockFns,
} from '@sim/testing/mocks/workflows-orchestration.mock'
import { workflowsUtilsMock, workflowsUtilsMockFns } from '@sim/testing/mocks/workflows-utils.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/permission-groups/config-scope.server', () => permissionGroupScopeMock)
vi.mock('@/lib/workspaces/permissions/utils', () => permissionsMock)
vi.mock('@/lib/posthog/server', () => posthogServerMock)
vi.mock('@/lib/workflows/orchestration', () => workflowsOrchestrationMock)
vi.mock('@/lib/workflows/utils', () => workflowsUtilsMock)

import { AuthType, checkSessionOrInternalAuth } from '@/lib/auth/hybrid'
import { DEFAULT_PERMISSION_GROUP_CONFIG } from '@/lib/permission-groups/fields'
import { POST } from '@/app/api/workflows/[id]/restore/route'

const mockRestore = workflowsOrchestrationMockFns.mockPerformRestoreWorkflow
const mockResolveGroupConfig = permissionGroupScopeMockFns.mockResolvePermissionGroupConfig

function restore() {
  return POST(
    createMockRequest({ method: 'POST', url: '/api/workflows/workflow-1/restore' }),
    createRouteContext({ id: 'workflow-1' })
  )
}

describe('POST /api/workflows/[id]/restore', () => {
  beforeEach(() => {
    vi.mocked(checkSessionOrInternalAuth).mockResolvedValue({
      success: true,
      userId: 'member-1',
      authType: AuthType.SESSION,
    })
    workflowsUtilsMockFns.mockGetWorkflowById.mockResolvedValue({
      id: 'workflow-1',
      workspaceId: 'workspace-1',
      folderId: null,
      locked: false,
      userId: 'someone-else',
    })
    permissionsMockFns.mockGetUserEntityPermissions.mockResolvedValue('write')
    mockRestore.mockResolvedValue({ success: true })
    mockResolveGroupConfig.mockReset()
    mockResolveGroupConfig.mockResolvedValue(null)
  })

  it('refuses a writer whose group withholds workflow editing, restoring nothing', async () => {
    mockResolveGroupConfig.mockResolvedValue({
      ...DEFAULT_PERMISSION_GROUP_CONFIG,
      disableWorkflowEditing: true,
    })

    const response = await restore()

    expect(response.status).toBe(403)
    expect((await response.json()).details).toEqual({
      code: 'PERMISSION_GROUP_CAPABILITY_BLOCKED',
    })
    expect(mockRestore).not.toHaveBeenCalled()
  })

  it('restores for a writer whose group allows workflow editing', async () => {
    const response = await restore()

    expect(response.status).toBe(200)
    expect(mockRestore).toHaveBeenCalledTimes(1)
  })
})
