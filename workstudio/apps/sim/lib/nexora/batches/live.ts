import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { sleep } from '@sim/utils/helpers'
import { generateShortId } from '@sim/utils/id'
import { LRUCache } from 'lru-cache'
import { generateRequestId } from '@/lib/core/utils/request'
import { instanceLimiter, interactiveBusy } from '@/lib/nexora/background-load'
import { type ApiExecutorDeps, executeApiItem } from '@/lib/nexora/batches/api-executor'
import { type EngineDeps, type ItemOutcome, runBatch } from '@/lib/nexora/batches/engine'
import type { BatchApiDeps } from '@/lib/nexora/batches/openai'
import * as repository from '@/lib/nexora/batches/repository'
import {
  createTableBatch,
  executeTableItem,
  type TableBatchDeps,
  type TableBatchRequest,
  type TableExecutorDeps,
  type TableInfo,
} from '@/lib/nexora/batches/table-executor'
import { checkBudget } from '@/lib/nexora/consumption/budgets'
import { admitModel, reserveSpending } from '@/lib/nexora/developer-api/gateway'
import { findNexoraApiKeyById } from '@/lib/nexora/developer-api/repository'
import { callUpstream, listUpstreamModels } from '@/lib/nexora/developer-api/upstream'
import { resolveTargets } from '@/lib/nexora/evaluations/launch'
import { liveLaunchDeps, targetDeps } from '@/lib/nexora/evaluations/live'
import { runTarget } from '@/lib/nexora/evaluations/targets'
import { beginCallTrace } from '@/lib/nexora/traces/call'
import { getColumnId } from '@/lib/table/column-keys'
import { addTableColumn } from '@/lib/table/columns/service'
import { TableRowNotFoundError } from '@/lib/table/rows/errors'
import { queryRows, updateRow } from '@/lib/table/rows/service'
import { getTableById } from '@/lib/table/service'
import type { TableDefinition } from '@/lib/table/types'

const logger = createLogger('NexoraBatches')

/** A running batch renews its lease this often; a stopped server loses it after `LEASE_MS`. */
const LEASE_MS = 90_000
/** Batches older than this are removed with their requests and files. */
const RETENTION_DAYS = 90
const TABLE_PAGE = 1000

const running = new Map<string, AbortController>()

/**
 * The table a running batch writes into, read again at most every 30 s: loading a table also counts
 * its rows, which a batch of thousands of answers must not do for each one.
 */
const tableCache = new LRUCache<string, TableDefinition>({ max: 50, ttl: 30_000 })

async function loadTable(tableId: string): Promise<TableDefinition | null> {
  const cached = tableCache.get(tableId)
  if (cached) return cached
  const table = await getTableById(tableId)
  if (table) tableCache.set(tableId, table)
  return table
}
const owner = `${process.pid}-${generateShortId(8)}`

function toTableInfo(table: TableDefinition): TableInfo {
  return {
    id: table.id,
    workspaceId: table.workspaceId,
    columns: table.schema.columns.map((column) => ({ id: getColumnId(column), name: column.name })),
  }
}

const apiDeps: ApiExecutorDeps = {
  now: () => new Date(),
  loadKey: findNexoraApiKeyById,
  admitModel,
  reserveSpending,
  callUpstream: (path, init) => callUpstream(path, init),
  beginTrace: beginCallTrace,
}

const tableExecutorDeps: TableExecutorDeps = {
  checkBudget: async (workspaceId) => {
    const check = await checkBudget(workspaceId, null)
    return check.allowed ? { allowed: true } : { allowed: false, message: check.message }
  },
  runTarget: (target, row, context) => runTarget(target, row, context, targetDeps),
  writeCell: async (tableId, workspaceId, rowId, columnId, value) => {
    const table = await loadTable(tableId)
    if (!table || table.workspaceId !== workspaceId) throw new Error('La table n’existe plus.')
    try {
      await updateRow(
        {
          tableId,
          rowId,
          workspaceId,
          data: { [columnId]: value },
          secretProvenance: undefined,
          capabilityGovernedUserId: null,
        },
        table,
        generateRequestId()
      )
      return 'written'
    } catch (error) {
      if (error instanceof TableRowNotFoundError) return 'row_missing'
      throw error
    }
  },
}

function executeItem(
  batch: repository.BatchRecord,
  item: repository.ItemRecord,
  signal: AbortSignal
): Promise<ItemOutcome> {
  return batch.source === 'table'
    ? executeTableItem(batch, item, signal, tableExecutorDeps)
    : executeApiItem(batch, item, signal, apiDeps)
}

function engineDeps(signal: AbortSignal): EngineDeps {
  return {
    store: repository,
    owner,
    leaseMs: LEASE_MS,
    now: () => new Date(),
    sleep,
    every: (ms, run) => {
      const timer = setInterval(() => void run().catch(() => undefined), ms)
      timer.unref?.()
      return () => clearInterval(timer)
    },
    limiter: instanceLimiter,
    interactiveBusy,
    executeItem,
    externalSignal: signal,
  }
}

/** Starts a batch in the background of this process, once; the cron adopts it if this one dies. */
export function startBatch(batchId: string): void {
  if (running.has(batchId)) return
  const controller = new AbortController()
  running.set(batchId, controller)
  void runBatch(batchId, engineDeps(controller.signal))
    .then((outcome) => logger.info('Batch ended', { batchId, outcome }))
    .catch((error) => logger.error('Batch crashed', { batchId, error: getErrorMessage(error) }))
    .finally(() => running.delete(batchId))
}

/** Interrupts the calls this process has in flight for a batch (the status itself is set by the caller). */
export function abortBatch(batchId: string): void {
  running.get(batchId)?.abort()
}

const tableBatchDeps: TableBatchDeps = {
  now: () => new Date(),
  getTable: async (tableId) => {
    const table = await getTableById(tableId)
    return table ? toTableInfo(table) : null
  },
  listRows: async (table, limit) => {
    const full = await getTableById(table.id)
    if (!full) return []
    const requestId = generateRequestId()
    const rows: { id: string; values: Record<string, unknown> }[] = []
    while (rows.length < limit) {
      const page = await queryRows(
        full,
        {
          limit: Math.min(TABLE_PAGE, limit - rows.length),
          offset: rows.length,
          includeTotal: false,
          withExecutions: false,
        },
        requestId
      )
      for (const row of page.rows) {
        rows.push({
          id: row.id,
          values: Object.fromEntries(
            full.schema.columns.map((column) => [
              column.name,
              row.data[getColumnId(column)] ?? row.data[column.name],
            ])
          ),
        })
      }
      if (page.rows.length < TABLE_PAGE) break
    }
    return rows
  },
  resolveTarget: async (workspaceId, input) => {
    const [target] = await resolveTargets(workspaceId, [input], liveLaunchDeps)
    return target
  },
  addColumn: async (table, name) =>
    toTableInfo(
      await addTableColumn(table.id, { name, type: 'string' }, generateRequestId(), {
        expectedWorkspaceId: table.workspaceId,
      })
    ),
  pendingLines: (workspaceId) => repository.pendingLinesInScope({ workspaceId }),
  insertBatch: repository.insertBatchWithItems,
  start: startBatch,
}

/** Creates a batch over the rows of a table and starts it (see {@link createTableBatch}). */
export function launchTableBatch(input: TableBatchRequest) {
  return createTableBatch(input, tableBatchDeps)
}

/**
 * What the cron does each minute for batches: takes over the batches nobody runs (their server
 * stopped, or they never started) and removes those that ended long ago. Returns what it did.
 */
export async function tickBatches(
  now: Date
): Promise<{ resumed: string[]; purged: { batches: number; files: number } }> {
  const adoptable = (await repository.listAdoptableBatchIds(now)).filter((id) => !running.has(id))
  for (const id of adoptable) startBatch(id)
  const purged = await repository.purgeBefore(new Date(now.getTime() - RETENTION_DAYS * 86_400_000))
  return { resumed: adoptable, purged }
}

/** What the `/v1/files` and `/v1/batches` routes run on. */
export const liveBatchApiDeps: BatchApiDeps = {
  now: () => new Date(),
  repo: repository,
  admitModel,
  modelExists: async (model) => {
    const wanted = model.trim().toLowerCase()
    const models = await listUpstreamModels()
    return models.some(
      (entry) =>
        entry.id.toLowerCase() === wanted ||
        entry.aliases.some((alias) => alias.toLowerCase() === wanted)
    )
  },
  start: startBatch,
  abort: abortBatch,
}
