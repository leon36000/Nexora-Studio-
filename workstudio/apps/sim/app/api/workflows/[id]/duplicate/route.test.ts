/**
 * Duplicating writes a new workflow into the source's workspace, so a member whose permission
 * group withholds workflow editing is refused before anything is copied.
 */
import { createRouteContext } from '@sim/testing/helpers/http'
import { auditMock } from '@sim/testing/mocks/audit.mock'
import {
  permissionGroupScopeMock,
  permissionGroupScopeMockFns,
} from '@sim/testing/mocks/permission-group-scope.mock'
import { posthogServerMock } from '@sim/testing/mocks/posthog-server.mock'
import { createMockRequest } from '@sim/testing/mocks/request.mock'
import { telemetryMock } from '@sim/testing/mocks/telemetry.mock'
import { workflowAuthzMockFns } from '@sim/testing/mocks/workflow-authz.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockDuplicateWorkflow } = vi.hoisted(() => ({ mockDuplicateWorkflow: vi.fn() }))

vi.mock('@sim/audit', () => auditMock)
vi.mock('@/lib/core/telemetry', () => telemetryMock)
vi.mock('@/lib/posthog/server', () => posthogServerMock)
vi.mock('@/lib/permission-groups/config-scope.server', () => permissionGroupScopeMock)
vi.mock('@/lib/workflows/persistence/duplicate', () => ({
  duplicateWorkflow: mockDuplicateWorkflow,
}))

import { AuthType, checkSessionOrInternalAuth } from '@/lib/auth/hybrid'
import { DEFAULT_PERMISSION_GROUP_CONFIG } from '@/lib/permission-groups/fields'
import { POST } from '@/app/api/workflows/[id]/duplicate/route'

const mockResolveGroupConfig = permissionGroupScopeMockFns.mockResolvePermissionGroupConfig

function duplicate() {
  return POST(
    createMockRequest({
      method: 'POST',
      url: '/api/workflows/workflow-1/duplicate',
      body: { name: 'Copie' },
    }),
    createRouteContext({ id: 'workflow-1' })
  )
}

describe('POST /api/workflows/[id]/duplicate', () => {
  beforeEach(() => {
    vi.mocked(checkSessionOrInternalAuth).mockResolvedValue({
      success: true,
      userId: 'member-1',
      authType: AuthType.SESSION,
    })
    workflowAuthzMockFns.mockAuthorizeWorkflowByWorkspacePermission.mockResolvedValue({
      allowed: true,
      status: 200,
      workflow: { id: 'workflow-1', workspaceId: 'workspace-1' },
      workspacePermission: 'write',
    })
    mockDuplicateWorkflow.mockResolvedValue({ id: 'workflow-2', name: 'Copie' })
    mockResolveGroupConfig.mockReset()
    mockResolveGroupConfig.mockResolvedValue(null)
  })

  it('refuses a writer whose group withholds workflow editing, copying nothing', async () => {
    mockResolveGroupConfig.mockResolvedValue({
      ...DEFAULT_PERMISSION_GROUP_CONFIG,
      disableWorkflowEditing: true,
    })

    const response = await duplicate()

    expect(response.status).toBe(403)
    expect(mockDuplicateWorkflow).not.toHaveBeenCalled()
  })

  it('duplicates for a writer whose group allows workflow editing', async () => {
    const response = await duplicate()

    expect(response.status).toBe(201)
    expect(mockDuplicateWorkflow).toHaveBeenCalledTimes(1)
  })
})
