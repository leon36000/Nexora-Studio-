import { createSessionPrincipal } from '@sim/testing/factories/principal.factory'
import { auditMock } from '@sim/testing/mocks/audit.mock'
import {
  permissionGroupsResolveMock,
  permissionGroupsResolveMockFns,
} from '@sim/testing/mocks/permission-groups-resolve.mock'
import { tableServiceMock } from '@sim/testing/mocks/table-service.mock'
import { workspaceAuthzMock, workspaceAuthzMockFns } from '@sim/testing/mocks/workspace-authz.mock'
import { workspaceContextMock } from '@sim/testing/mocks/workspace-context.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { live, mockRouterResolver } = vi.hoisted(() => ({
  live: { launchTableBatch: vi.fn(), abortBatch: vi.fn(), startBatch: vi.fn() },
  mockRouterResolver: vi.fn(),
}))

vi.mock('@sim/audit', () => auditMock)
vi.mock('@sim/platform-authz/workspace', () => workspaceAuthzMock)
vi.mock('@/lib/workspaces/application/context', () => workspaceContextMock)
vi.mock('@/lib/nexora/batches/repository', () => ({}))
vi.mock('@/lib/nexora/batches/live', () => live)
vi.mock('@/lib/table/service', () => tableServiceMock)
vi.mock('@/lib/permission-groups/resolve.server', () => permissionGroupsResolveMock)
vi.mock('@/lib/nexora/developer-api/upstream', () => ({ routerResolver: mockRouterResolver }))

import { launchBatchUseCase } from '@/lib/nexora/batches/application/use-cases'

const WORKSPACE = 'workspace-1'
const member = createSessionPrincipal({ userId: 'user-1' })

const launchInput = (model: string) => ({
  workspaceId: WORKSPACE,
  name: 'Classement',
  tableId: 'tbl-1',
  target: { kind: 'model' as const, model },
  template: '{{avis}}',
  outputColumnName: 'Categorie',
  maxTokens: 16,
  concurrency: 2,
  expiresInHours: 24,
})

/** The real model gate runs here: only the group and Nexora API's model list are simulated. */
describe('batch launch against the real model gate', () => {
  beforeEach(() => {
    workspaceAuthzMockFns.mockResolveEffectiveWorkspacePermission.mockResolvedValue('write')
    permissionGroupsResolveMockFns.mockGetUserPermissionConfig.mockResolvedValue({
      allowedModelProviders: null,
      deniedModels: ['vllm/cloud-glm-5-3'],
    })
    mockRouterResolver.mockResolvedValue((name: string) => name.trim().toLowerCase())
  })

  it('refuses the exact model the group denies, whichever way the target spells it', async () => {
    for (const model of ['vllm/cloud-glm-5-3', 'cloud-glm-5-3']) {
      await expect(
        launchBatchUseCase.execute({ principal: member, input: launchInput(model) })
      ).rejects.toMatchObject({ code: 'forbidden' })
    }
    expect(live.launchTableBatch).not.toHaveBeenCalled()
  })

  it('starts a batch on a model the group does not deny', async () => {
    live.launchTableBatch.mockResolvedValue({
      id: 'batch_1',
      workspaceId: WORKSPACE,
      source: 'table',
      name: 'Classement',
      model: 'qwen2.5:7b',
      status: 'validating',
      tableId: 'tbl-1',
      config: {},
      concurrency: 2,
      total: 1,
      completed: 0,
      failed: 0,
      promptTokens: 0,
      completionTokens: 0,
      errors: null,
      createdAt: new Date('2026-10-25T10:00:00Z'),
      startedAt: null,
      finishedAt: null,
      expiresAt: new Date('2026-10-26T10:00:00Z'),
    })
    await launchBatchUseCase.execute({
      principal: member,
      input: launchInput('vllm/qwen2.5:7b'),
    })
    expect(live.launchTableBatch).toHaveBeenCalled()
  })
})
