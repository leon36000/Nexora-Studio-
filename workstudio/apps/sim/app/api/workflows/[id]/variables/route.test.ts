/**
 * Tests for workflow variables API route
 * Tests the optimized permissions and caching system
 */
import {
  auditMock,
  hybridAuthMockFns,
  workflowAuthzMockFns,
  workflowsUtilsMock,
} from '@sim/testing'
import {
  permissionGroupScopeMock,
  permissionGroupScopeMockFns,
} from '@sim/testing/mocks/permission-group-scope.mock'
import { NextRequest } from 'next/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@sim/audit', () => auditMock)

vi.mock('@/lib/workflows/utils', () => workflowsUtilsMock)

vi.mock('@/lib/permission-groups/config-scope.server', () => permissionGroupScopeMock)

import { db } from '@sim/db'
import { AuthType, checkSessionOrInternalAuth } from '@/lib/auth/hybrid'
import { DEFAULT_PERMISSION_GROUP_CONFIG } from '@/lib/permission-groups/fields'
import { GET, POST } from '@/app/api/workflows/[id]/variables/route'

describe('Workflow Variables API Route', () => {
  describe('GET /api/workflows/[id]/variables', () => {
    it('should deny access when user has no workspace permissions', async () => {
      const mockWorkflow = {
        id: 'workflow-123',
        userId: 'other-user',
        workspaceId: 'workspace-456',
        variables: {},
      }

      hybridAuthMockFns.mockCheckSessionOrInternalAuth.mockResolvedValueOnce({
        success: true,
        userId: 'user-123',
        authType: 'session',
      })
      workflowAuthzMockFns.mockAuthorizeWorkflowByWorkspacePermission.mockResolvedValueOnce({
        allowed: false,
        status: 403,
        message: 'Unauthorized: Access denied to read this workflow',
        workflow: mockWorkflow,
        workspacePermission: null,
      })

      const req = new NextRequest('http://localhost:3000/api/workflows/workflow-123/variables')
      const params = Promise.resolve({ id: 'workflow-123' })

      const response = await GET(req, { params })

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized: Access denied to read this workflow')
    })
  })

  describe('POST /api/workflows/[id]/variables', () => {
    it('should deny access for users without permissions', async () => {
      const mockWorkflow = {
        id: 'workflow-123',
        userId: 'other-user',
        workspaceId: 'workspace-456',
        variables: {},
      }

      hybridAuthMockFns.mockCheckSessionOrInternalAuth.mockResolvedValueOnce({
        success: true,
        userId: 'user-123',
        authType: 'session',
      })
      workflowAuthzMockFns.mockAuthorizeWorkflowByWorkspacePermission.mockResolvedValueOnce({
        allowed: false,
        status: 403,
        message: 'Unauthorized: Access denied to write this workflow',
        workflow: mockWorkflow,
        workspacePermission: null,
      })

      const variables = {
        'var-1': {
          id: 'var-1',
          workflowId: 'workflow-123',
          name: 'test',
          type: 'string',
          value: 'hello',
        },
      }

      const req = new NextRequest('http://localhost:3000/api/workflows/workflow-123/variables', {
        method: 'POST',
        body: JSON.stringify({ variables }),
      })
      const params = Promise.resolve({ id: 'workflow-123' })

      const response = await POST(req, { params })

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized: Access denied to write this workflow')
    })

    it('refuses a writer whose group withholds workflow editing, writing nothing', async () => {
      vi.mocked(checkSessionOrInternalAuth).mockResolvedValueOnce({
        success: true,
        userId: 'user-123',
        authType: AuthType.SESSION,
      })
      workflowAuthzMockFns.mockAuthorizeWorkflowByWorkspacePermission.mockResolvedValueOnce({
        allowed: true,
        status: 200,
        workflow: { id: 'workflow-123', workspaceId: 'workspace-456', variables: {} },
        workspacePermission: 'write',
      })
      permissionGroupScopeMockFns.mockResolvePermissionGroupConfig.mockResolvedValueOnce({
        ...DEFAULT_PERMISSION_GROUP_CONFIG,
        disableWorkflowEditing: true,
      })

      const req = new NextRequest('http://localhost:3000/api/workflows/workflow-123/variables', {
        method: 'POST',
        body: JSON.stringify({ variables: {} }),
      })

      const response = await POST(req, { params: Promise.resolve({ id: 'workflow-123' }) })

      expect(response.status).toBe(403)
      expect((await response.json()).details).toEqual({
        code: 'PERMISSION_GROUP_CAPABILITY_BLOCKED',
      })
      expect(vi.mocked(db.update)).not.toHaveBeenCalled()
    })
  })
})
