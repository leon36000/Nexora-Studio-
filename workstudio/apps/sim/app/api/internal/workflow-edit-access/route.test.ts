/**
 * The realtime server asks this route whether a member's permission group withholds workflow
 * editing before it lets a socket write a workflow. It answers only to the shared internal key.
 */
import { createRouteContext } from '@sim/testing/helpers/http'
import { copilotHttpMock, copilotHttpMockFns } from '@sim/testing/mocks/copilot-http.mock'
import {
  permissionGroupScopeMock,
  permissionGroupScopeMockFns,
} from '@sim/testing/mocks/permission-group-scope.mock'
import { createMockRequest } from '@sim/testing/mocks/request.mock'
import { workflowAuthzMockFns } from '@sim/testing/mocks/workflow-authz.mock'
import { NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/mothership/request/http', () => copilotHttpMock)
vi.mock('@/lib/permission-groups/config-scope.server', () => permissionGroupScopeMock)

import { DEFAULT_PERMISSION_GROUP_CONFIG } from '@/lib/permission-groups/fields'
import { POST } from '@/app/api/internal/workflow-edit-access/route'

const resolveGroupConfig = permissionGroupScopeMockFns.mockResolvePermissionGroupConfig

function askAccess() {
  return POST(
    createMockRequest({
      method: 'POST',
      url: '/api/internal/workflow-edit-access',
      body: { workflowId: 'workflow-1', userId: 'member-1' },
      headers: { 'x-api-key': 'internal' },
    }),
    createRouteContext({})
  )
}

describe('POST /api/internal/workflow-edit-access', () => {
  beforeEach(() => {
    copilotHttpMockFns.mockCheckInternalApiKey.mockReturnValue({ success: true })
    copilotHttpMockFns.mockCreateUnauthorizedResponse.mockImplementation(() =>
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )
    workflowAuthzMockFns.mockGetActiveWorkflowContext.mockResolvedValue({
      workflow: { id: 'workflow-1', workspaceId: 'workspace-1' },
      workspaceId: 'workspace-1',
      workspaceOrganizationId: 'organization-1',
    })
    resolveGroupConfig.mockReset()
    resolveGroupConfig.mockResolvedValue(null)
  })

  it('401s a caller without the internal key, resolving nothing', async () => {
    copilotHttpMockFns.mockCheckInternalApiKey.mockReturnValue({ success: false })

    const response = await askAccess()

    expect(response.status).toBe(401)
    expect(resolveGroupConfig).not.toHaveBeenCalled()
  })

  it('reports editing withheld when the member group withholds it', async () => {
    resolveGroupConfig.mockResolvedValue({
      ...DEFAULT_PERMISSION_GROUP_CONFIG,
      disableWorkflowEditing: true,
    })

    const response = await askAccess()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ withheld: true })
  })

  it('reports editing allowed when no group withholds it', async () => {
    const response = await askAccess()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ withheld: false })
  })

  it('404s a workflow that no longer exists', async () => {
    workflowAuthzMockFns.mockGetActiveWorkflowContext.mockResolvedValue(null)

    const response = await askAccess()

    expect(response.status).toBe(404)
  })
})
