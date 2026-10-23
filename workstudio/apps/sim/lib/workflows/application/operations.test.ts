import { permissionSatisfies } from '@sim/platform-authz/predicates'
import {
  createPersonalApiKeyPrincipal,
  createSessionPrincipal,
} from '@sim/testing/factories/principal.factory'
import {
  permissionGroupScopeMock,
  permissionGroupScopeMockFns,
} from '@sim/testing/mocks/permission-group-scope.mock'
import { workspaceAuthzMock, workspaceAuthzMockFns } from '@sim/testing/mocks/workspace-authz.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@sim/platform-authz/workspace', () => workspaceAuthzMock)
vi.mock('@/lib/permission-groups/config-scope.server', () => permissionGroupScopeMock)

import {
  authorizeWorkspaceOperation,
  PermissionGroupCapabilityError,
  type WorkspaceOperation,
} from '@/lib/core/application'
import { copilotOperations } from '@/lib/nexora/copilot/operations'
import { DEFAULT_PERMISSION_GROUP_CONFIG } from '@/lib/permission-groups/fields'
import { workflowOperations } from '@/lib/workflows/application/operations'

describe('workflow operation registry', () => {
  it('keeps every workspace-key operation consistent and at or below the write ceiling', () => {
    for (const operation of Object.values(workflowOperations)) {
      expect(
        operation.principalKinds.includes('workspace_api_key'),
        `${operation.id} has inconsistent workspace API-key declarations`
      ).toBe(operation.workspaceApiKey === 'allow')

      if (operation.workspaceApiKey === 'allow') {
        expect(
          permissionSatisfies('write', operation.minimumRole),
          `${operation.id} exceeds the workspace API-key write ceiling`
        ).toBe(true)
      }
    }
  })

  it('admits executor delegation only to workflow deployment operations', () => {
    for (const operation of [
      workflowOperations.deploy,
      workflowOperations.undeploy,
      workflowOperations.activateVersion,
    ]) {
      expect(operation).toMatchObject({
        minimumRole: 'admin',
        workspaceApiKey: 'deny',
        principalKinds: ['session', 'personal_api_key', 'oauth_access_token', 'delegated'],
        delegatedServices: ['copilot', 'executor'],
      })
    }

    for (const operation of [workflowOperations.listVersions, workflowOperations.readVersion]) {
      expect(operation).toMatchObject({
        minimumRole: 'read',
        workspaceApiKey: 'allow',
        principalKinds: [
          'session',
          'personal_api_key',
          'oauth_access_token',
          'workspace_api_key',
          'delegated',
        ],
        delegatedServices: ['copilot', 'executor'],
      })
    }

    expect(workflowOperations.deployChat.delegatedServices).toEqual(['copilot'])
    expect(workflowOperations.revertVersion.delegatedServices).toEqual(['copilot'])
  })

  /**
   * Toggling unauthenticated public execution removes the authentication
   * requirement from a deployed workflow, so it takes an accountable human:
   * admin role and no workspace key. Copilot uses the actual user's admin role.
   */
  it('reserves public-execution changes for an accountable human admin', () => {
    expect(workflowOperations.updatePublicApi).toMatchObject({
      id: 'workflows.public_api.update',
      minimumRole: 'admin',
      workspaceApiKey: 'deny',
      principalKinds: ['session', 'personal_api_key', 'oauth_access_token', 'delegated'],
    })
    expect(workflowOperations.updatePublicApi.principalKinds).not.toContain('workspace_api_key')
    expect(workflowOperations.updatePublicApi.delegatedServices).toEqual(['copilot'])
  })

  /**
   * `workflows.operations.apply` stays denied to workspace API keys: the three
   * permission lookups it performs need a human subject, and both substitutes
   * for an actorless key fail *open* — attributing to the workspace billing
   * owner evaluates the batch as the least-restricted account, and passing no
   * user makes `getUserPermissionConfig` return `null`, which every caller
   * reads as unrestricted. Re-open it only once those lookups fail closed.
   */
  it('keeps workflow edit batches denied to actorless workspace keys', () => {
    expect(workflowOperations.applyOperations).toMatchObject({
      id: 'workflows.operations.apply',
      minimumRole: 'write',
      workspaceApiKey: 'deny',
      principalKinds: ['session', 'personal_api_key', 'oauth_access_token', 'delegated'],
      delegatedServices: ['copilot'],
    })
    expect(workflowOperations.applyOperations.principalKinds).not.toContain('workspace_api_key')
  })
})

/**
 * « Lecture seule » must stop a member from changing a workflow at the server, not only in the
 * editor: every operation that writes a workflow's graph, metadata, placement or history is
 * refused when the member's group withholds `workflows.edit`, while reading and running stay open.
 */
describe('workflow editing capability', () => {
  const context = {
    workspaceId: 'workspace-1',
    workspaceOrganizationId: 'organization-1',
    allowPersonalApiKeys: true,
  }
  const withholding = { ...DEFAULT_PERMISSION_GROUP_CONFIG, disableWorkflowEditing: true }

  const editingOperations: WorkspaceOperation[] = [
    workflowOperations.create,
    workflowOperations.update,
    workflowOperations.replaceState,
    workflowOperations.applyOperations,
    workflowOperations.restore,
    workflowOperations.applyVariableOperations,
    workflowOperations.moveBulk,
    workflowOperations.duplicate,
    workflowOperations.delete,
    workflowOperations.createFolder,
    workflowOperations.relocateFolder,
    workflowOperations.deleteFolder,
    workflowOperations.revertVersion,
    workflowOperations.updateVersion,
    workflowOperations.importPreview,
    workflowOperations.import,
    copilotOperations.generatePlan,
    copilotOperations.createWorkflow,
  ]

  const readingAndRunningOperations: WorkspaceOperation[] = [
    workflowOperations.list,
    workflowOperations.read,
    workflowOperations.export,
    workflowOperations.listFolders,
    workflowOperations.listVersions,
    workflowOperations.readVersion,
    workflowOperations.compareVersions,
    workflowOperations.execute,
    workflowOperations.listRuns,
    workflowOperations.readRun,
    workflowOperations.cancelRun,
    workflowOperations.resumeRun,
  ]

  beforeEach(() => {
    workspaceAuthzMockFns.mockResolveEffectiveWorkspacePermission.mockResolvedValue('admin')
    permissionGroupScopeMockFns.mockResolvePermissionGroupConfig.mockResolvedValue(null)
  })

  it('refuses every editing operation to a member whose group withholds it', async () => {
    permissionGroupScopeMockFns.mockResolvePermissionGroupConfig.mockResolvedValue(withholding)

    for (const operation of editingOperations) {
      const refusal = await authorizeWorkspaceOperation(
        createSessionPrincipal(),
        operation,
        context
      ).catch((error: unknown) => error)
      expect(refusal, operation.id).toBeInstanceOf(PermissionGroupCapabilityError)
      expect((refusal as PermissionGroupCapabilityError).capability, operation.id).toBe(
        'workflows.edit'
      )
    }
  })

  it('refuses a personal API key of a restricted member, not only the session', async () => {
    permissionGroupScopeMockFns.mockResolvePermissionGroupConfig.mockResolvedValue(withholding)

    await expect(
      authorizeWorkspaceOperation(
        createPersonalApiKeyPrincipal(),
        workflowOperations.replaceState,
        context
      )
    ).rejects.toBeInstanceOf(PermissionGroupCapabilityError)
  })

  it('allows every editing operation when the group does not withhold it', async () => {
    permissionGroupScopeMockFns.mockResolvePermissionGroupConfig.mockResolvedValue(
      DEFAULT_PERMISSION_GROUP_CONFIG
    )

    for (const operation of editingOperations) {
      await expect(
        authorizeWorkspaceOperation(createSessionPrincipal(), operation, context),
        operation.id
      ).resolves.toBeUndefined()
    }
  })

  it('keeps reading and running workflows open to a restricted member', async () => {
    permissionGroupScopeMockFns.mockResolvePermissionGroupConfig.mockResolvedValue(withholding)

    for (const operation of readingAndRunningOperations) {
      await expect(
        authorizeWorkspaceOperation(createSessionPrincipal(), operation, context),
        operation.id
      ).resolves.toBeUndefined()
    }
  })
})
