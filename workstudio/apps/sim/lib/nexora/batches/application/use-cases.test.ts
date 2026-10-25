import { createSessionPrincipal } from '@sim/testing/factories/principal.factory'
import { auditMock, auditMockFns } from '@sim/testing/mocks/audit.mock'
import { tableServiceMock, tableServiceMockFns } from '@sim/testing/mocks/table-service.mock'
import { workspaceAuthzMock, workspaceAuthzMockFns } from '@sim/testing/mocks/workspace-authz.mock'
import { workspaceContextMock } from '@sim/testing/mocks/workspace-context.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { repo, live } = vi.hoisted(() => ({
  repo: {
    getBatch: vi.fn(),
    listBatches: vi.fn(),
    listResults: vi.fn(),
    requestCancel: vi.fn(),
    deleteBatch: vi.fn(),
  },
  live: { launchTableBatch: vi.fn(), abortBatch: vi.fn(), startBatch: vi.fn() },
}))

vi.mock('@sim/audit', () => auditMock)
vi.mock('@sim/platform-authz/workspace', () => workspaceAuthzMock)
vi.mock('@/lib/workspaces/application/context', () => workspaceContextMock)
vi.mock('@/lib/nexora/batches/repository', () => repo)
vi.mock('@/lib/nexora/batches/live', () => live)
vi.mock('@/lib/table/service', () => tableServiceMock)

import {
  cancelBatchUseCase,
  deleteBatchUseCase,
  exportBatchUseCase,
  launchBatchUseCase,
  listBatchesUseCase,
  listSourcesUseCase,
  readBatchUseCase,
} from '@/lib/nexora/batches/application/use-cases'

const WORKSPACE = 'workspace-1'
const member = createSessionPrincipal({ userId: 'user-1' })
const reader = createSessionPrincipal({ userId: 'reader' })

const batchRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'batch_1',
  workspaceId: WORKSPACE,
  source: 'table',
  name: 'Classement',
  model: 'qwen2.5:7b',
  status: 'in_progress',
  tableId: 'tbl-1',
  config: { outputColumnName: 'Categorie', skipped: 2 },
  concurrency: 2,
  total: 10,
  completed: 3,
  failed: 1,
  promptTokens: 100,
  completionTokens: 20,
  errors: null,
  createdAt: new Date('2026-10-25T10:00:00Z'),
  startedAt: null,
  finishedAt: null,
  expiresAt: new Date('2026-10-26T10:00:00Z'),
  ...overrides,
})

const launchInput = {
  workspaceId: WORKSPACE,
  name: 'Classement',
  tableId: 'tbl-1',
  target: { kind: 'model' as const, model: 'qwen2.5:7b' },
  template: '{{avis}}',
  outputColumnName: 'Categorie',
  maxTokens: 16,
  concurrency: 2,
  expiresInHours: 24,
}

describe('batch use cases', () => {
  beforeEach(() => {
    workspaceAuthzMockFns.mockResolveEffectiveWorkspacePermission.mockResolvedValue('write')
  })

  describe('rights', () => {
    it('lets a member who may only read the workspace see its batches, not start one', async () => {
      workspaceAuthzMockFns.mockResolveEffectiveWorkspacePermission.mockResolvedValue('read')
      repo.listBatches.mockResolvedValue({ batches: [batchRecord()], hasMore: false })
      await expect(
        listBatchesUseCase.execute({ principal: reader, input: { workspaceId: WORKSPACE } })
      ).resolves.toHaveLength(1)
      await expect(
        launchBatchUseCase.execute({ principal: reader, input: launchInput })
      ).rejects.toMatchObject({ name: expect.stringMatching(/Permission|Forbidden/) })
      expect(live.launchTableBatch).not.toHaveBeenCalled()
    })

    it('refuses a reader the cancellation, the deletion and the table list', async () => {
      workspaceAuthzMockFns.mockResolveEffectiveWorkspacePermission.mockResolvedValue('read')
      for (const attempt of [
        cancelBatchUseCase.execute({
          principal: reader,
          input: { workspaceId: WORKSPACE, batchId: 'batch_1' },
        }),
        deleteBatchUseCase.execute({
          principal: reader,
          input: { workspaceId: WORKSPACE, batchId: 'batch_1' },
        }),
        listSourcesUseCase.execute({ principal: reader, input: { workspaceId: WORKSPACE } }),
      ]) {
        await expect(attempt).rejects.toMatchObject({
          name: expect.stringMatching(/Permission|Forbidden/),
        })
      }
      expect(repo.requestCancel).not.toHaveBeenCalled()
      expect(repo.deleteBatch).not.toHaveBeenCalled()
    })
  })

  describe('launching', () => {
    it('starts the table batch for the member and audits it', async () => {
      live.launchTableBatch.mockResolvedValue(batchRecord({ total: 8 }))
      const result = await launchBatchUseCase.execute({ principal: member, input: launchInput })
      expect(live.launchTableBatch).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceId: WORKSPACE, userId: 'user-1', tableId: 'tbl-1' })
      )
      expect(result.id).toBe('batch_1')
      expect(auditMockFns.mockRecordAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'batch.launched',
          resourceId: 'batch_1',
          metadata: expect.objectContaining({ requests: 8 }),
        })
      )
    })
  })

  describe('reading', () => {
    it('answers not found for a batch of another workspace, whatever the way in', async () => {
      repo.getBatch.mockResolvedValue(null)
      for (const attempt of [
        readBatchUseCase.execute({
          principal: member,
          input: { workspaceId: WORKSPACE, batchId: 'batch_x', after: -1, limit: 50 },
        }),
        exportBatchUseCase.execute({
          principal: member,
          input: { workspaceId: WORKSPACE, batchId: 'batch_x' },
        }),
        cancelBatchUseCase.execute({
          principal: member,
          input: { workspaceId: WORKSPACE, batchId: 'batch_x' },
        }),
      ]) {
        await expect(attempt).rejects.toMatchObject({ code: 'not_found' })
      }
      expect(repo.getBatch).toHaveBeenCalledWith({ workspaceId: WORKSPACE }, 'batch_x')
    })

    it('returns the batch and a page of results', async () => {
      repo.getBatch.mockResolvedValue(batchRecord())
      repo.listResults.mockResolvedValue([
        {
          id: 'i1',
          position: 0,
          customId: 'r1',
          rowRef: 'r1',
          status: 'done',
          response: null,
          answer: 'Positif',
          error: null,
          latencyMs: 40,
          inputText: 'Super',
        },
      ])
      const { batch, results } = await readBatchUseCase.execute({
        principal: member,
        input: { workspaceId: WORKSPACE, batchId: 'batch_1', after: -1, limit: 50 },
      })
      expect(batch).toMatchObject({ id: 'batch_1', outputColumnName: 'Categorie', skipped: 2 })
      expect(results).toEqual([
        {
          position: 0,
          customId: 'r1',
          input: 'Super',
          answer: 'Positif',
          status: 'done',
          error: null,
          latencyMs: 40,
        },
      ])
      expect(repo.listResults).toHaveBeenCalledWith('batch_1', 'all', -1, 50)
    })

    it('lists the workspace’s tables with their columns for the creation form', async () => {
      tableServiceMockFns.mockListTables.mockResolvedValue([
        {
          id: 't1',
          name: 'Avis',
          rowCount: 500,
          schema: { columns: [{ name: 'avis' }, { name: 'client' }] },
        },
      ])
      const tables = await listSourcesUseCase.execute({
        principal: member,
        input: { workspaceId: WORKSPACE },
      })
      expect(tables).toEqual([
        { id: 't1', name: 'Avis', rowCount: 500, columns: ['avis', 'client'] },
      ])
    })
  })

  describe('cancelling and deleting', () => {
    it('cancels a running batch: marks it, interrupts the calls and lets this process finish it', async () => {
      repo.getBatch.mockResolvedValue(batchRecord())
      repo.requestCancel.mockResolvedValue(batchRecord({ status: 'cancelling' }))
      const result = await cancelBatchUseCase.execute({
        principal: member,
        input: { workspaceId: WORKSPACE, batchId: 'batch_1' },
      })
      expect(result.status).toBe('cancelling')
      expect(live.abortBatch).toHaveBeenCalledWith('batch_1')
      expect(live.startBatch).toHaveBeenCalledWith('batch_1')
      expect(auditMockFns.mockRecordAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'batch.cancelled', resourceId: 'batch_1' })
      )
    })

    it('says a finished batch cannot be cancelled', async () => {
      repo.getBatch.mockResolvedValue(batchRecord({ status: 'completed' }))
      await expect(
        cancelBatchUseCase.execute({
          principal: member,
          input: { workspaceId: WORKSPACE, batchId: 'batch_1' },
        })
      ).rejects.toMatchObject({ code: 'conflict' })
      expect(repo.requestCancel).not.toHaveBeenCalled()
    })

    it('refuses to delete a batch that is still running', async () => {
      repo.getBatch.mockResolvedValue(batchRecord())
      await expect(
        deleteBatchUseCase.execute({
          principal: member,
          input: { workspaceId: WORKSPACE, batchId: 'batch_1' },
        })
      ).rejects.toMatchObject({ code: 'conflict' })
      expect(repo.deleteBatch).not.toHaveBeenCalled()
    })

    it('deletes an ended batch and audits it', async () => {
      repo.getBatch.mockResolvedValue(batchRecord({ status: 'cancelled' }))
      repo.deleteBatch.mockResolvedValue(true)
      await deleteBatchUseCase.execute({
        principal: member,
        input: { workspaceId: WORKSPACE, batchId: 'batch_1' },
      })
      expect(repo.deleteBatch).toHaveBeenCalledWith({ workspaceId: WORKSPACE }, 'batch_1')
      expect(auditMockFns.mockRecordAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'batch.deleted', resourceId: 'batch_1' })
      )
    })
  })
})
