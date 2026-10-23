/**
 * The editor's whole-graph save is the door a « Lecture seule » member would use to change a
 * workflow without the canvas, so it must refuse on the permission group, after the role check.
 */
import {
  permissionGroupScopeMock,
  permissionGroupScopeMockFns,
} from '@sim/testing/mocks/permission-group-scope.mock'
import { createMockRequest } from '@sim/testing/mocks/request.mock'
import { workflowAuthzMockFns } from '@sim/testing/mocks/workflow-authz.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockSaveWorkflowNormalizedState } = vi.hoisted(() => ({
  mockSaveWorkflowNormalizedState: vi.fn(),
}))

vi.mock('@/lib/permission-groups/config-scope.server', () => permissionGroupScopeMock)
vi.mock('@/lib/workflows/persistence/save-normalized-state', () => ({
  saveWorkflowNormalizedState: mockSaveWorkflowNormalizedState,
}))

import { AuthType, checkSessionOrInternalAuth } from '@/lib/auth/hybrid'
import { DEFAULT_PERMISSION_GROUP_CONFIG } from '@/lib/permission-groups/fields'
import { PUT } from '@/app/api/workflows/[id]/state/route'

const workflowRecord = { id: 'workflow-1', workspaceId: 'workspace-1', name: 'Devis' }
const withholding = { ...DEFAULT_PERMISSION_GROUP_CONFIG, disableWorkflowEditing: true }
const resolveGroupConfig = permissionGroupScopeMockFns.mockResolvePermissionGroupConfig
const mockAuth = vi.mocked(checkSessionOrInternalAuth)

function putState() {
  return PUT(
    createMockRequest({
      method: 'PUT',
      url: '/api/workflows/workflow-1/state',
      body: { blocks: {}, edges: [] },
    }),
    { params: Promise.resolve({ id: 'workflow-1' }) }
  )
}

describe('PUT /api/workflows/[id]/state', () => {
  beforeEach(() => {
    resolveGroupConfig.mockReset()
    resolveGroupConfig.mockResolvedValue(null)
    mockAuth.mockResolvedValue({ success: true, userId: 'member-1', authType: AuthType.SESSION })
    workflowAuthzMockFns.mockAuthorizeWorkflowByWorkspacePermission.mockResolvedValue({
      allowed: true,
      status: 200,
      workflow: workflowRecord,
      workspacePermission: 'write',
    })
    /** Mirrors the real save: it refuses on the authorization the route hands it. */
    mockSaveWorkflowNormalizedState.mockImplementation(
      async ({ authorization }: { authorization: { allowed: boolean; message?: string } }) =>
        authorization.allowed
          ? { success: true, warnings: [] }
          : { success: false, status: 403, error: authorization.message }
    )
  })

  it('refuses a writer whose group withholds workflow editing, without saving', async () => {
    resolveGroupConfig.mockResolvedValue(withholding)

    const response = await putState()

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.details).toEqual({ code: 'PERMISSION_GROUP_CAPABILITY_BLOCKED' })
    expect(body.error).toMatch(/permission group/)
    expect(mockSaveWorkflowNormalizedState).not.toHaveBeenCalled()
  })

  it('saves for a writer whose group allows workflow editing', async () => {
    resolveGroupConfig.mockResolvedValue(DEFAULT_PERMISSION_GROUP_CONFIG)

    const response = await putState()

    expect(response.status).toBe(200)
    expect(mockSaveWorkflowNormalizedState).toHaveBeenCalledTimes(1)
  })

  it('answers a non-writer with the role refusal, never consulting the group', async () => {
    resolveGroupConfig.mockResolvedValue(withholding)
    workflowAuthzMockFns.mockAuthorizeWorkflowByWorkspacePermission.mockResolvedValue({
      allowed: false,
      status: 403,
      message: 'Unauthorized: Access denied to write this workflow',
      workflow: workflowRecord,
      workspacePermission: 'read',
    })

    const response = await putState()

    expect(response.status).toBe(403)
    expect((await response.json()).error).toBe('Unauthorized: Access denied to write this workflow')
    expect(resolveGroupConfig).not.toHaveBeenCalled()
  })

  it('judges an internal call by role only, since its user is the run actor, not a member asking', async () => {
    resolveGroupConfig.mockResolvedValue(withholding)
    mockAuth.mockResolvedValue({
      success: true,
      userId: 'member-1',
      authType: AuthType.INTERNAL_JWT,
    })

    const response = await putState()

    expect(response.status).toBe(200)
  })
})
