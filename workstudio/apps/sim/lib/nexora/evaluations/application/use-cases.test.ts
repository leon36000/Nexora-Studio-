import { createSessionPrincipal } from '@sim/testing/factories/principal.factory'
import { auditMock, auditMockFns } from '@sim/testing/mocks/audit.mock'
import {
  tableRowsServiceMock,
  tableRowsServiceMockFns,
} from '@sim/testing/mocks/table-rows-service.mock'
import { tableServiceMock, tableServiceMockFns } from '@sim/testing/mocks/table-service.mock'
import { workspaceAuthzMock, workspaceAuthzMockFns } from '@sim/testing/mocks/workspace-authz.mock'
import {
  workspaceContextMock,
  workspaceContextMockFns,
} from '@sim/testing/mocks/workspace-context.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { repo, live, traces, assistant } = vi.hoisted(() => ({
  repo: {
    insertDataset: vi.fn(),
    getDataset: vi.fn(),
    listRows: vi.fn(),
    saveJudge: vi.fn(),
    cancelCampaign: vi.fn(),
    getCampaign: vi.fn(),
    insertSchedule: vi.fn(),
    getJudge: vi.fn(),
  },
  live: {
    judgeLive: vi.fn(),
    launchEvaluationCampaign: vi.fn(),
    abortCampaign: vi.fn(),
    liveLaunchDeps: {},
  },
  traces: { getTraceWithSpans: vi.fn(), listTraces: vi.fn(), resolveTraceViewer: vi.fn() },
  assistant: { loadConversation: vi.fn(), listMessages: vi.fn(), listConversations: vi.fn() },
}))

vi.mock('@sim/audit', () => auditMock)
vi.mock('@sim/platform-authz/workspace', () => workspaceAuthzMock)
vi.mock('@/lib/workspaces/application/context', () => workspaceContextMock)
vi.mock('@/lib/nexora/evaluations/repository', () => repo)
vi.mock('@/lib/nexora/evaluations/live', () => live)
vi.mock('@/lib/nexora/traces/repository', () => ({
  getTraceWithSpans: traces.getTraceWithSpans,
  listTraces: traces.listTraces,
}))
vi.mock('@/lib/nexora/traces/viewer', () => ({ resolveTraceViewer: traces.resolveTraceViewer }))
vi.mock('@/lib/nexora/assistant/repository', () => assistant)
vi.mock('@/lib/table/service', () => tableServiceMock)
vi.mock('@/lib/table/rows/service', () => tableRowsServiceMock)

import {
  cancelCampaignUseCase,
  createDatasetUseCase,
  launchCampaignUseCase,
  parseSeriesRef,
  rowsToTry,
  saveJudgeUseCase,
  saveScheduleUseCase,
  tryJudgeUseCase,
} from '@/lib/nexora/evaluations/application/use-cases'

const WORKSPACE = 'workspace-1'
const member = createSessionPrincipal({ userId: 'user-1' })

function row(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    datasetId: 'ds-1',
    position: 0,
    input: `Question ${id}`,
    expected: null,
    guidance: null,
    candidate: null,
    humanVerdict: null,
    humanNote: null,
    sourceRef: null,
    ...overrides,
  }
}

describe('evaluation use cases', () => {
  beforeEach(() => {
    workspaceContextMockFns.mockResolveActiveWorkspaceApplicationContext.mockResolvedValue({
      workspaceId: WORKSPACE,
      workspaceOrganizationId: null,
      allowPersonalApiKeys: true,
      billedAccountUserId: 'owner-1',
    })
    workspaceAuthzMockFns.mockResolveEffectiveWorkspacePermission.mockResolvedValue('write')
    traces.resolveTraceViewer.mockResolvedValue({
      userId: 'user-1',
      isInstanceAdmin: false,
      workspacePermission: 'admin',
    })
    repo.insertDataset.mockImplementation(async (input) => ({
      id: 'ds-1',
      ...input,
      rowCount: input.rows.length,
      annotatedCount: 0,
    }))
  })

  describe('rights', () => {
    it('refuses a campaign to a member who may only read the workspace', async () => {
      workspaceAuthzMockFns.mockResolveEffectiveWorkspacePermission.mockResolvedValue('read')
      await expect(
        launchCampaignUseCase.execute({
          principal: createSessionPrincipal({ userId: 'reader' }),
          input: {
            workspaceId: WORKSPACE,
            name: 'x',
            datasetId: 'ds-1',
            judgeId: 'j-1',
            targets: [{ kind: 'model', model: 'a' }],
            concurrency: 2,
          },
        })
      ).rejects.toMatchObject({ name: expect.stringMatching(/Permission|Forbidden/) })
      expect(live.launchEvaluationCampaign).not.toHaveBeenCalled()
    })

    it('audits the launch with the number of items and the targets', async () => {
      live.launchEvaluationCampaign.mockResolvedValue({
        id: 'camp-1',
        name: 'FAQ tarifs',
        itemTotal: 60,
        scheduleId: null,
        targets: [{ label: 'qwen2.5:7b' }, { label: 'GLM 5.3' }],
      })
      await launchCampaignUseCase.execute({
        principal: member,
        input: {
          workspaceId: WORKSPACE,
          name: 'FAQ tarifs',
          datasetId: 'ds-1',
          judgeId: 'j-1',
          targets: [{ kind: 'model', model: 'a' }],
          concurrency: 2,
        },
      })
      expect(auditMockFns.mockRecordAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'evaluation_campaign.launched',
          resourceId: 'camp-1',
          metadata: expect.objectContaining({ items: 60, targets: ['qwen2.5:7b', 'GLM 5.3'] }),
        })
      )
    })
  })

  describe('importing from the member’s own material', () => {
    const create = (
      source: Parameters<typeof createDatasetUseCase.execute>[0]['input']['source']
    ) =>
      createDatasetUseCase.execute({
        principal: member,
        input: { workspaceId: WORKSPACE, name: 'Import', description: '', source },
      })

    it('never imports another member’s Assistant conversation', async () => {
      assistant.loadConversation.mockResolvedValue({
        id: 'conv-1',
        userId: 'someone-else',
        workspaceId: WORKSPACE,
      })
      await expect(
        create({ kind: 'conversations', conversationIds: ['conv-1'] })
      ).rejects.toMatchObject({
        code: 'not_found',
      })
      expect(assistant.listMessages).not.toHaveBeenCalled()
      expect(repo.insertDataset).not.toHaveBeenCalled()
    })

    it('imports the member’s own conversation, one row per answered question', async () => {
      assistant.loadConversation.mockResolvedValue({
        id: 'conv-1',
        userId: 'user-1',
        workspaceId: WORKSPACE,
      })
      assistant.listMessages.mockResolvedValue([
        { role: 'user', content: 'Prix ?', interrupted: false },
        { role: 'assistant', content: '49 €', interrupted: false },
      ])
      await create({ kind: 'conversations', conversationIds: ['conv-1'] })
      expect(repo.insertDataset).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'conversations',
          rows: [expect.objectContaining({ input: 'Prix ?', candidate: '49 €' })],
        })
      )
    })

    it('refuses a private trace of another author, even to a workspace administrator', async () => {
      traces.getTraceWithSpans.mockResolvedValue({
        trace: {
          id: 'trace-1',
          workspaceId: WORKSPACE,
          userId: 'someone-else',
          visibility: 'private',
          inputPreview: 'Question privée',
          outputPreview: 'Réponse',
        },
      })
      await expect(create({ kind: 'traces', traceIds: ['trace-1'] })).rejects.toMatchObject({
        code: 'not_found',
      })
    })

    it('refuses a trace of another workspace', async () => {
      traces.getTraceWithSpans.mockResolvedValue({
        trace: {
          id: 'trace-1',
          workspaceId: 'other-workspace',
          userId: 'user-1',
          visibility: 'workspace',
          inputPreview: 'Q',
          outputPreview: 'R',
        },
      })
      await expect(create({ kind: 'traces', traceIds: ['trace-1'] })).rejects.toMatchObject({
        code: 'not_found',
      })
    })

    it('imports a shared trace', async () => {
      traces.getTraceWithSpans.mockResolvedValue({
        trace: {
          id: 'trace-1',
          workspaceId: WORKSPACE,
          userId: 'someone-else',
          visibility: 'workspace',
          inputPreview: 'Prix ?',
          outputPreview: '49 €',
        },
      })
      await create({ kind: 'traces', traceIds: ['trace-1'] })
      expect(repo.insertDataset).toHaveBeenCalledWith(
        expect.objectContaining({
          rows: [expect.objectContaining({ input: 'Prix ?', sourceRef: 'trace:trace-1' })],
        })
      )
    })

    it('imports a table of the workspace by its column names, whatever keys the rows use', async () => {
      tableServiceMockFns.mockGetTableById.mockResolvedValue({
        id: 'tbl-1',
        workspaceId: WORKSPACE,
        schema: {
          columns: [
            { id: 'col_a', name: 'question' },
            { id: 'col_b', name: 'attendu' },
          ],
        },
      })
      tableRowsServiceMockFns.mockQueryRows.mockResolvedValue({
        rows: [
          { data: { col_a: 'Prix ?', col_b: '49 €' } },
          { data: { col_a: 'Essai ?', col_b: '14 jours' } },
        ],
      })
      await create({ kind: 'table', tableId: 'tbl-1' })
      expect(repo.insertDataset).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'table',
          rows: [
            expect.objectContaining({ input: 'Prix ?', expected: '49 €' }),
            expect.objectContaining({ input: 'Essai ?', expected: '14 jours' }),
          ],
        })
      )
    })

    it('never imports a table of another workspace', async () => {
      tableServiceMockFns.mockGetTableById.mockResolvedValue({
        id: 'tbl-1',
        workspaceId: 'other-workspace',
        schema: { columns: [{ id: 'col_a', name: 'question' }] },
      })
      await expect(create({ kind: 'table', tableId: 'tbl-1' })).rejects.toMatchObject({
        code: 'not_found',
      })
      expect(tableRowsServiceMockFns.mockQueryRows).not.toHaveBeenCalled()
    })

    it('explains a file with no usable row instead of creating an empty set', async () => {
      await expect(create({ kind: 'jsonl', text: '{"autre": 1}\n' })).rejects.toMatchObject({
        code: 'validation',
      })
      expect(repo.insertDataset).not.toHaveBeenCalled()
    })
  })

  describe('judges', () => {
    it('refuses success labels that are not labels, before saving', async () => {
      await expect(
        saveJudgeUseCase.execute({
          principal: member,
          input: {
            workspaceId: WORKSPACE,
            name: 'Juge',
            config: {
              kind: 'llm_class',
              model: 'nexora-default',
              instructions: '',
              labels: ['correct', 'incorrect'],
              passLabels: ['bon'],
            },
          },
        })
      ).rejects.toMatchObject({ code: 'validation' })
      expect(repo.saveJudge).not.toHaveBeenCalled()
    })

    it('says so when a test set has no answer to judge', async () => {
      repo.getDataset.mockResolvedValue({ id: 'ds-1', name: 'Vide' })
      repo.listRows.mockResolvedValue([row('1'), row('2')])
      await expect(
        tryJudgeUseCase.execute({
          principal: member,
          input: {
            workspaceId: WORKSPACE,
            datasetId: 'ds-1',
            limit: 10,
            config: { kind: 'contains', value: 'x', caseSensitive: false },
          },
        })
      ).rejects.toMatchObject({ code: 'validation' })
      expect(live.judgeLive).not.toHaveBeenCalled()
    })

    it('tries the annotated rows first and keeps the agreement with the person', async () => {
      repo.getDataset.mockResolvedValue({ id: 'ds-1', name: 'FAQ' })
      repo.listRows.mockResolvedValue([
        row('plain', { expected: 'ok' }),
        row('annotated-pass', { candidate: 'r', humanVerdict: 'pass' }),
        row('annotated-fail', { candidate: 'r', humanVerdict: 'fail' }),
      ])
      live.judgeLive.mockImplementation(async (_config, subject) => ({
        verdict: subject.input.includes('annotated-fail') ? 'pass' : 'pass',
        score: null,
        note: '',
        usage: null,
      }))
      const result = await tryJudgeUseCase.execute({
        principal: member,
        input: {
          workspaceId: WORKSPACE,
          datasetId: 'ds-1',
          limit: 2,
          config: { kind: 'contains', value: 'x', caseSensitive: false },
        },
      })
      expect(result.results.map((entry) => entry.rowId)).toEqual([
        'annotated-pass',
        'annotated-fail',
      ])
      expect(result.agreement).toEqual({ total: 2, matched: 1, rate: 0.5 })
    })
  })

  describe('campaigns', () => {
    it('cancels the campaign and stops its calls in this process', async () => {
      repo.cancelCampaign.mockResolvedValue({ id: 'camp-1', name: 'FAQ' })
      await cancelCampaignUseCase.execute({
        principal: member,
        input: { workspaceId: WORKSPACE, campaignId: 'camp-1' },
      })
      expect(live.abortCampaign).toHaveBeenCalledWith('camp-1')
    })

    it('tells a campaign that already ended from one that does not exist', async () => {
      repo.cancelCampaign.mockResolvedValue(null)
      repo.getCampaign.mockResolvedValueOnce({ id: 'camp-1' })
      await expect(
        cancelCampaignUseCase.execute({
          principal: member,
          input: { workspaceId: WORKSPACE, campaignId: 'camp-1' },
        })
      ).rejects.toMatchObject({ code: 'conflict' })
      repo.getCampaign.mockResolvedValueOnce(null)
      await expect(
        cancelCampaignUseCase.execute({
          principal: member,
          input: { workspaceId: WORKSPACE, campaignId: 'camp-2' },
        })
      ).rejects.toMatchObject({ code: 'not_found' })
      expect(live.abortCampaign).not.toHaveBeenCalled()
    })
  })

  describe('schedules', () => {
    it('refuses an invalid expression before touching the database', async () => {
      await expect(
        saveScheduleUseCase.execute({
          principal: member,
          input: {
            workspaceId: WORKSPACE,
            name: 'Nuit',
            cron: 'pas une expression',
            timezone: 'Europe/Paris',
            datasetId: 'ds-1',
            judgeId: 'j-1',
            targets: [{ kind: 'model', model: 'a' }],
            concurrency: 2,
            enabled: true,
          },
        })
      ).rejects.toMatchObject({ code: 'validation' })
      expect(repo.insertSchedule).not.toHaveBeenCalled()
    })
  })
})

describe('pure helpers', () => {
  it('chooses annotated rows before the others and skips rows with nothing to judge', () => {
    const rows = [
      row('empty'),
      row('expected', { expected: 'e' }),
      row('annotated', { candidate: 'c', humanVerdict: 'fail' }),
    ]
    expect(rowsToTry(rows as never, 10).map((entry) => entry.id)).toEqual(['annotated', 'expected'])
    expect(rowsToTry(rows as never, 1).map((entry) => entry.id)).toEqual(['annotated'])
  })

  it('reads a series reference, cutting at the last colon', () => {
    expect(parseSeriesRef('camp-1:t2')).toEqual({ campaignId: 'camp-1', targetKey: 't2' })
    expect(() => parseSeriesRef('camp-1')).toThrow(/invalide/)
    expect(() => parseSeriesRef(':t1')).toThrow(/invalide/)
  })
})
