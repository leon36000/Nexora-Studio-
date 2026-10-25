import { describe, expect, it, vi } from 'vitest'
import { OrchestrationError } from '@/lib/core/orchestration/types'
import type { BatchRecord, ItemRecord, NewBatch, NewItem } from '@/lib/nexora/batches/repository'
import {
  createTableBatch,
  executeTableItem,
  renderTemplate,
  sanitizeColumnName,
  type TableBatchDeps,
  type TableExecutorDeps,
  type TableInfo,
} from '@/lib/nexora/batches/table-executor'
import type { EvalTarget } from '@/lib/nexora/evaluations/types'
import { NexoraWandRejectedError, NexoraWandUnavailableError } from '@/lib/nexora/wand'

const NOW = new Date('2026-10-25T10:00:00Z')

const table: TableInfo = {
  id: 'tbl-1',
  workspaceId: 'ws-1',
  columns: [
    { id: 'col_a', name: 'avis' },
    { id: 'col_b', name: 'client' },
  ],
}

const target: EvalTarget = {
  key: 't1',
  kind: 'model',
  label: 'qwen2.5:7b',
  model: 'qwen2.5:7b',
  system: 'Classe l’avis.',
}

function setup(
  rows: { id: string; values: Record<string, unknown> }[],
  overrides: Partial<TableBatchDeps> = {}
) {
  let created: { batch: NewBatch; items: NewItem[] } | null = null
  const addColumn = vi.fn(
    async (_table: TableInfo, name: string): Promise<TableInfo> => ({
      ...table,
      columns: [...table.columns, { id: 'col_new', name }],
    })
  )
  const start = vi.fn()
  const deps: TableBatchDeps = {
    now: () => NOW,
    getTable: async (tableId) => (tableId === table.id ? table : null),
    listRows: async () => rows,
    resolveTarget: async () => target,
    addColumn,
    pendingLines: async () => 0,
    insertBatch: async (batch, items) => {
      created = { batch, items }
      return { id: 'batch_1', total: items.length } as BatchRecord
    },
    start,
    ...overrides,
  }
  return { deps, addColumn, start, created: () => created }
}

const request = {
  workspaceId: 'ws-1',
  userId: 'user-1',
  tableId: 'tbl-1',
  name: 'Classement des avis',
  target: { kind: 'model' as const, model: 'qwen2.5:7b' },
  template: 'Avis de {{client}} : {{avis}}',
  outputColumnName: 'Catégorie',
  maxTokens: 16,
  concurrency: 2,
  expiresInHours: 24,
}

describe('renderTemplate', () => {
  it('fills the placeholders with the row’s values, whatever the case of the column name', () => {
    expect(renderTemplate('{{Avis}} / {{ client }}', { avis: 'Super', client: 'Léa' })).toBe(
      'Super / Léa'
    )
  })

  it('leaves an unknown column empty and prints numbers and booleans', () => {
    expect(renderTemplate('{{x}}|{{n}}|{{b}}', { n: 3, b: true })).toBe('|3|true')
  })

  it('writes objects as JSON', () => {
    expect(renderTemplate('{{o}}', { o: { a: 1 } })).toBe('{"a":1}')
  })
})

describe('sanitizeColumnName', () => {
  it.each([
    ['Catégorie', 'Categorie'],
    ['Classe de l’avis', 'Classe_de_l_avis'],
    ['2024 total', '_2024_total'],
    ['  résultat  ', 'resultat'],
  ])('turns %s into %s', (name, expected) => {
    expect(sanitizeColumnName(name)).toBe(expected)
  })

  it('returns nothing for a name without any letter or digit', () => {
    expect(sanitizeColumnName(' !!! ')).toBe('')
  })
})

describe('createTableBatch', () => {
  const rows = [
    { id: 'r1', values: { avis: 'Super', client: 'Léa' } },
    { id: 'r2', values: { avis: 'Nul', client: 'Max' } },
    { id: 'r3', values: { avis: '', client: '' } },
  ]

  it('creates the result column, one request per row with something to process, and starts the batch', async () => {
    const { deps, addColumn, start, created } = setup(rows)
    const batch = await createTableBatch(request, deps)
    expect(addColumn).toHaveBeenCalledWith(table, 'Categorie')
    expect(batch.total).toBe(2)
    const made = created()
    expect(made?.items.map((item) => [item.rowRef, item.request])).toEqual([
      ['r1', { input: 'Avis de Léa : Super' }],
      ['r2', { input: 'Avis de Max : Nul' }],
    ])
    expect(made?.batch).toMatchObject({
      source: 'table',
      tableId: 'tbl-1',
      name: 'Classement des avis',
      model: 'qwen2.5:7b',
      concurrency: 2,
      config: expect.objectContaining({
        outputColumnId: 'col_new',
        outputColumnName: 'Categorie',
        maxTokens: 16,
        skipped: 1,
      }),
    })
    expect(made?.batch.expiresAt.getTime()).toBe(NOW.getTime() + 24 * 3_600_000)
    expect(start).toHaveBeenCalledWith('batch_1')
  })

  it('refuses a table of another workspace as not found, before touching anything', async () => {
    const { deps, addColumn } = setup(rows, {
      getTable: async () => ({ ...table, workspaceId: 'ws-2' }),
    })
    await expect(createTableBatch(request, deps)).rejects.toMatchObject({ code: 'not_found' })
    expect(addColumn).not.toHaveBeenCalled()
  })

  it('refuses a result column that already exists, whatever its case', async () => {
    const { deps, addColumn } = setup(rows)
    await expect(
      createTableBatch({ ...request, outputColumnName: 'AVIS' }, deps)
    ).rejects.toBeInstanceOf(OrchestrationError)
    expect(addColumn).not.toHaveBeenCalled()
  })

  it('refuses a result column name without any usable character', async () => {
    const { deps } = setup(rows)
    await expect(
      createTableBatch({ ...request, outputColumnName: '???' }, deps)
    ).rejects.toMatchObject({
      code: 'validation',
    })
  })

  it('refuses a table with more rows than a batch holds, without creating a column', async () => {
    const many = Array.from({ length: 10_001 }, (_, index) => ({
      id: `r${index}`,
      values: { avis: 'x', client: 'y' },
    }))
    const { deps, addColumn } = setup(many)
    await expect(createTableBatch(request, deps)).rejects.toMatchObject({ code: 'validation' })
    expect(addColumn).not.toHaveBeenCalled()
  })

  it('refuses when nothing has text to process', async () => {
    const { deps, addColumn } = setup([{ id: 'r3', values: { avis: '', client: '' } }])
    await expect(
      createTableBatch({ ...request, template: '{{avis}}' }, deps)
    ).rejects.toMatchObject({ code: 'validation' })
    expect(addColumn).not.toHaveBeenCalled()
  })

  it('refuses when the workspace already has too many requests waiting', async () => {
    const { deps, addColumn } = setup(rows, { pendingLines: async () => 49_999 })
    await expect(createTableBatch(request, deps)).rejects.toMatchObject({ code: 'validation' })
    expect(addColumn).not.toHaveBeenCalled()
  })

  it('clamps the concurrency and the expiry to their limits', async () => {
    const { deps, created } = setup(rows)
    await createTableBatch({ ...request, concurrency: 99, expiresInHours: 9999 }, deps)
    expect(created()?.batch.concurrency).toBe(4)
    expect(created()?.batch.expiresAt.getTime()).toBe(NOW.getTime() + 168 * 3_600_000)
  })
})

const batch = {
  id: 'batch_1',
  workspaceId: 'ws-1',
  createdBy: 'user-1',
  name: 'Classement des avis',
  tableId: 'tbl-1',
  config: {
    target,
    template: '{{avis}}',
    outputColumnId: 'col_new',
    outputColumnName: 'Categorie',
    maxTokens: 16,
  },
} as unknown as BatchRecord

const item = {
  id: 'i1',
  rowRef: 'r1',
  request: { input: 'Avis de Léa : Super' },
  attempt: 1,
} as unknown as ItemRecord

function executorSetup(overrides: Partial<TableExecutorDeps> = {}) {
  const writeCell = vi.fn(async () => 'written' as const)
  const runTarget = vi.fn(async () => ({
    answer: 'Positif',
    latencyMs: 40,
    usage: { promptTokens: 12, completionTokens: 2 },
    executionId: null,
  }))
  const deps: TableExecutorDeps = {
    checkBudget: async () => ({ allowed: true }),
    runTarget,
    writeCell,
    ...overrides,
  }
  return { deps, writeCell, runTarget, signal: new AbortController().signal }
}

describe('executeTableItem', () => {
  it('runs the target with the row’s text and the token cap, then writes the answer in the result column', async () => {
    const { deps, writeCell, runTarget, signal } = executorSetup()
    const outcome = await executeTableItem(batch, item, signal, deps)
    expect(runTarget).toHaveBeenCalledWith(
      target,
      { input: 'Avis de Léa : Super' },
      {
        workspaceId: 'ws-1',
        userId: 'user-1',
        campaignName: 'Lot : Classement des avis',
        signal,
        maxTokens: 16,
      }
    )
    expect(writeCell).toHaveBeenCalledWith('tbl-1', 'ws-1', 'r1', 'col_new', 'Positif')
    expect(outcome).toMatchObject({
      kind: 'done',
      result: { answer: 'Positif', promptTokens: 12, completionTokens: 2, latencyMs: 40 },
    })
  })

  it('stops the batch, without a call, when the monthly budget is reached', async () => {
    const { deps, runTarget, signal } = executorSetup({
      checkBudget: async () => ({ allowed: false, message: 'Budget atteint.' }),
    })
    const outcome = await executeTableItem(batch, item, signal, deps)
    expect(outcome).toEqual({
      kind: 'stop',
      code: 'monthly_budget_reached',
      message: 'Budget atteint.',
    })
    expect(runTarget).not.toHaveBeenCalled()
  })

  it('stops the batch when the call itself is refused for the budget', async () => {
    const refused = Object.assign(new Error('Budget mensuel atteint.'), {
      code: 'monthly_budget_reached',
    })
    const { deps, signal } = executorSetup({
      runTarget: vi.fn(async () => {
        throw refused
      }),
    })
    expect(await executeTableItem(batch, item, signal, deps)).toMatchObject({ kind: 'stop' })
  })

  it('tries again when the model service is unavailable', async () => {
    const { deps, signal } = executorSetup({
      runTarget: vi.fn(async () => {
        throw new NexoraWandUnavailableError('HTTP 503')
      }),
    })
    expect(await executeTableItem(batch, item, signal, deps)).toMatchObject({
      kind: 'error',
      retryable: true,
    })
  })

  it('does not try again when the model refuses the request', async () => {
    const { deps, signal } = executorSetup({
      runTarget: vi.fn(async () => {
        throw new NexoraWandRejectedError('contexte trop long')
      }),
    })
    expect(await executeTableItem(batch, item, signal, deps)).toMatchObject({
      kind: 'error',
      retryable: false,
      problem: { code: 'model_rejected' },
    })
  })

  it('fails the row, writing nothing, when the model answers nothing (a reasoning model out of tokens)', async () => {
    const { deps, writeCell, signal } = executorSetup({
      runTarget: vi.fn(async () => ({
        answer: '   ',
        latencyMs: 40,
        usage: { promptTokens: 12, completionTokens: 6 },
        executionId: null,
      })),
    })
    const outcome = await executeTableItem(batch, item, signal, deps)
    expect(outcome).toMatchObject({
      kind: 'error',
      retryable: false,
      problem: { code: 'empty_answer', message: expect.stringContaining('plafond') },
    })
    expect(writeCell).not.toHaveBeenCalled()
  })

  it('reports an abort as such, writing nothing', async () => {
    const controller = new AbortController()
    const { deps, writeCell } = executorSetup({
      runTarget: vi.fn(async () => {
        controller.abort()
        throw new Error('aborted')
      }),
    })
    expect(await executeTableItem(batch, item, controller.signal, deps)).toEqual({
      kind: 'aborted',
    })
    expect(writeCell).not.toHaveBeenCalled()
  })

  it('counts the request as answered when its row was deleted meanwhile', async () => {
    const { deps, signal } = executorSetup({ writeCell: vi.fn(async () => 'row_missing' as const) })
    expect(await executeTableItem(batch, item, signal, deps)).toMatchObject({ kind: 'done' })
  })

  it('fails the request when the answer cannot be written in the cell', async () => {
    const { deps, signal } = executorSetup({
      writeCell: vi.fn(async () => {
        throw new OrchestrationError('validation', 'Cellule trop grande')
      }),
    })
    expect(await executeTableItem(batch, item, signal, deps)).toMatchObject({
      kind: 'error',
      retryable: false,
      problem: {
        code: 'cell_write_failed',
        message: expect.stringContaining('Cellule trop grande'),
      },
    })
  })
})
