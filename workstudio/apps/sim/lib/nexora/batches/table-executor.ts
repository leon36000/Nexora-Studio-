import { getErrorMessage } from '@sim/utils/errors'
import { isRecordLike } from '@sim/utils/object'
import { OrchestrationError } from '@/lib/core/orchestration/types'
import type { ItemOutcome } from '@/lib/nexora/batches/engine'
import type { BatchRecord, ItemRecord, NewBatch, NewItem } from '@/lib/nexora/batches/repository'
import {
  DEFAULT_BATCH_CONCURRENCY,
  MAX_BATCH_CONCURRENCY,
  MAX_BATCH_LINES,
  MAX_COMPLETION_HOURS,
  MAX_PENDING_LINES,
} from '@/lib/nexora/batches/types'
import type { TargetInput } from '@/lib/nexora/evaluations/launch'
import type { TargetContext, TargetResult } from '@/lib/nexora/evaluations/targets'
import type { EvalTarget } from '@/lib/nexora/evaluations/types'
import { NexoraWandRejectedError, NexoraWandUnavailableError } from '@/lib/nexora/wand'

/** A table as the batch needs it: its columns by id and name. */
export interface TableInfo {
  id: string
  workspaceId: string
  columns: { id: string; name: string }[]
}

interface TableRowValues {
  id: string
  /** Cell values by column name. */
  values: Record<string, unknown>
}

/** What a table batch remembers of how it was asked for. */
type TableBatchConfig = {
  target: EvalTarget
  template: string
  outputColumnId: string
  outputColumnName: string
  maxTokens: number | null
  /** Rows left out because the template gave them no text. */
  skipped: number
}

/** A target as `createTableBatch` stored it: resolved, with its key, label and kind. */
function isEvalTarget(value: unknown): value is EvalTarget {
  return (
    isRecordLike(value) &&
    typeof value.key === 'string' &&
    typeof value.label === 'string' &&
    (value.kind === 'model' || value.kind === 'prompt' || value.kind === 'agent')
  )
}

/** Reads a stored batch config back; `null` when it is not a table batch's. */
function readConfig(value: Record<string, unknown> | null): TableBatchConfig | null {
  if (!value || !isEvalTarget(value.target) || typeof value.outputColumnId !== 'string') {
    return null
  }
  return {
    target: value.target,
    template: typeof value.template === 'string' ? value.template : '',
    outputColumnId: value.outputColumnId,
    outputColumnName: typeof value.outputColumnName === 'string' ? value.outputColumnName : '',
    maxTokens: typeof value.maxTokens === 'number' ? value.maxTokens : null,
    skipped: typeof value.skipped === 'number' ? value.skipped : 0,
  }
}

export interface TableBatchRequest {
  workspaceId: string
  userId: string
  tableId: string
  name: string
  target: TargetInput
  /** The text sent for each row; `{{column}}` is replaced by the row's value. */
  template: string
  outputColumnName: string
  maxTokens: number | null
  concurrency: number
  expiresInHours: number
}

export interface TableBatchDeps {
  now: () => Date
  getTable: (tableId: string) => Promise<TableInfo | null>
  listRows: (table: TableInfo, limit: number) => Promise<TableRowValues[]>
  resolveTarget: (workspaceId: string, input: TargetInput) => Promise<EvalTarget>
  addColumn: (table: TableInfo, name: string) => Promise<TableInfo>
  pendingLines: (workspaceId: string) => Promise<number>
  insertBatch: (batch: NewBatch, items: NewItem[]) => Promise<BatchRecord>
  /** Starts the background run of a created batch (does not wait for it). */
  start: (batchId: string) => void
}

function invalid(message: string): never {
  throw new OrchestrationError('validation', message)
}

function valueText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

/** Replaces each `{{column}}` (case-insensitive) with the row's text; an unknown column gives nothing. */
export function renderTemplate(template: string, values: Record<string, unknown>): string {
  const byName = new Map(Object.entries(values).map(([name, value]) => [name.toLowerCase(), value]))
  return template.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_match, name: string) =>
    valueText(byName.get(name.toLowerCase()))
  )
}

/** Whether the template cites columns and the row has nothing in any of them: nothing to process. */
function citesOnlyEmptyCells(template: string, values: Record<string, unknown>): boolean {
  const names = [...template.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)].map((match) => match[1])
  if (names.length === 0) return false
  const byName = new Map(Object.entries(values).map(([name, value]) => [name.toLowerCase(), value]))
  return names.every((name) => valueText(byName.get(name.toLowerCase())).trim() === '')
}

const MAX_COLUMN_NAME_LENGTH = 64

/** A column name a table accepts: letters, digits and underscores, not starting with a digit. */
export function sanitizeColumnName(name: string): string {
  const plain = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, MAX_COLUMN_NAME_LENGTH)
  if (plain === '') return ''
  return /^[0-9]/.test(plain) ? `_${plain}` : plain
}

/**
 * Creates a batch that processes the rows of a table with a model, a prompt or an agent, the
 * answers going to a new column. Everything is checked before the column is added: the table
 * belongs to the workspace, the column name is free, the target exists, the template gives text,
 * and the batch fits the limits. Starts the batch in the background.
 */
export async function createTableBatch(
  input: TableBatchRequest,
  deps: TableBatchDeps
): Promise<BatchRecord> {
  const table = await deps.getTable(input.tableId)
  if (!table || table.workspaceId !== input.workspaceId) {
    throw new OrchestrationError('not_found', 'Table introuvable')
  }
  const columnName = sanitizeColumnName(input.outputColumnName)
  if (!columnName) {
    invalid('Donnez un nom à la colonne de résultat (lettres, chiffres et tirets bas).')
  }
  if (table.columns.some((column) => column.name.toLowerCase() === columnName.toLowerCase())) {
    invalid(`La colonne « ${columnName} » existe déjà dans la table : choisissez un autre nom.`)
  }
  if (!input.template.trim()) invalid('Écrivez le texte à envoyer pour chaque ligne.')
  const target = await deps.resolveTarget(input.workspaceId, input.target)

  const rows = await deps.listRows(table, MAX_BATCH_LINES + 1)
  if (rows.length > MAX_BATCH_LINES) {
    invalid(
      `Cette table a plus de ${MAX_BATCH_LINES} lignes : un lot en traite ${MAX_BATCH_LINES} au plus.`
    )
  }
  const items: NewItem[] = []
  for (const row of rows) {
    if (citesOnlyEmptyCells(input.template, row.values)) continue
    const text = renderTemplate(input.template, row.values).trim()
    if (!text) continue
    items.push({
      position: items.length,
      customId: row.id,
      request: { input: text },
      rowRef: row.id,
    })
  }
  if (items.length === 0) {
    invalid(
      'Aucune ligne n’a de texte à traiter avec ce modèle de texte : vérifiez les colonnes citées.'
    )
  }
  const waiting = await deps.pendingLines(input.workspaceId)
  if (waiting + items.length > MAX_PENDING_LINES) {
    invalid(
      `Cet espace a déjà ${waiting} requêtes en attente ; il en accepte ${MAX_PENDING_LINES} au plus. Attendez la fin des lots en cours.`
    )
  }

  const withColumn = await deps.addColumn(table, columnName)
  const column = withColumn.columns.find((candidate) => candidate.name === columnName)
  if (!column) invalid('La colonne de résultat n’a pas pu être créée.')

  const config: TableBatchConfig = {
    target,
    template: input.template,
    outputColumnId: column.id,
    outputColumnName: columnName,
    maxTokens: input.maxTokens,
    skipped: rows.length - items.length,
  }
  const hours = Math.min(Math.max(Math.trunc(input.expiresInHours), 1), MAX_COMPLETION_HOURS)
  const batch = await deps.insertBatch(
    {
      scope: { workspaceId: input.workspaceId },
      apiKeyId: null,
      createdBy: input.userId,
      source: 'table',
      name: input.name,
      endpoint: '/table',
      model: target.label,
      tableId: table.id,
      config,
      concurrency: Math.min(
        Math.max(Math.trunc(input.concurrency || DEFAULT_BATCH_CONCURRENCY), 1),
        MAX_BATCH_CONCURRENCY
      ),
      expiresAt: new Date(deps.now().getTime() + hours * 3_600_000),
    },
    items
  )
  deps.start(batch.id)
  return batch
}

export interface TableExecutorDeps {
  checkBudget: (workspaceId: string) => Promise<{ allowed: boolean; message?: string }>
  runTarget: (
    target: EvalTarget,
    row: { input: string },
    context: TargetContext
  ) => Promise<TargetResult>
  writeCell: (
    tableId: string,
    workspaceId: string,
    rowId: string,
    columnId: string,
    value: string
  ) => Promise<'written' | 'row_missing'>
}

function isBudgetRefusal(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'monthly_budget_reached'
  )
}

/**
 * Runs one row of a table batch: the monthly budget is checked first (reached ⇒ the whole batch
 * stops), the target answers the row's text, and the answer goes to the result column. A busy or
 * unreachable model is tried again; a refusal of the model or a cell that cannot hold the answer
 * fails the row. A row deleted meanwhile is skipped silently: its answer stays in the results.
 */
export async function executeTableItem(
  batch: BatchRecord,
  item: ItemRecord,
  signal: AbortSignal,
  deps: TableExecutorDeps
): Promise<ItemOutcome> {
  const config = readConfig(batch.config)
  const input = typeof item.request.input === 'string' ? item.request.input : ''
  if (!config || !batch.workspaceId || !batch.tableId || !item.rowRef) {
    return {
      kind: 'error',
      retryable: false,
      problem: { code: 'invalid_batch', message: 'Ce lot est incomplet : relancez-le.' },
      response: null,
      latencyMs: null,
    }
  }
  const budget = await deps.checkBudget(batch.workspaceId)
  if (!budget.allowed) {
    return {
      kind: 'stop',
      code: 'monthly_budget_reached',
      message: budget.message ?? 'Budget mensuel atteint.',
    }
  }

  let result: TargetResult
  try {
    result = await deps.runTarget(
      config.target,
      { input },
      {
        workspaceId: batch.workspaceId,
        userId: batch.createdBy,
        campaignName: `Lot : ${batch.name ?? 'sans nom'}`,
        signal,
        ...(config.maxTokens ? { maxTokens: config.maxTokens } : {}),
      }
    )
  } catch (error) {
    if (signal.aborted) return { kind: 'aborted' }
    if (isBudgetRefusal(error)) {
      return {
        kind: 'stop',
        code: 'monthly_budget_reached',
        message: getErrorMessage(error, 'Budget mensuel atteint.'),
      }
    }
    const unavailable = error instanceof NexoraWandUnavailableError
    return {
      kind: 'error',
      retryable: unavailable,
      problem: {
        code:
          error instanceof NexoraWandRejectedError
            ? 'model_rejected'
            : unavailable
              ? 'model_busy'
              : 'target_failed',
        message:
          error instanceof NexoraWandRejectedError
            ? `Le modèle a refusé la requête : ${error.reason}`
            : unavailable
              ? 'Le modèle est occupé ou injoignable.'
              : getErrorMessage(error, 'La cible n’a pas pu répondre.'),
      },
      response: null,
      latencyMs: null,
    }
  }

  if (!result.answer.trim()) {
    return {
      kind: 'error',
      retryable: false,
      problem: {
        code: 'empty_answer',
        message:
          'Le modèle n’a rien répondu. Un modèle à raisonnement peut avoir épuisé le plafond de jetons : relevez-le ou videz-le.',
      },
      response: null,
      latencyMs: result.latencyMs,
    }
  }

  try {
    await deps.writeCell(
      batch.tableId,
      batch.workspaceId,
      item.rowRef,
      config.outputColumnId,
      result.answer
    )
  } catch (error) {
    return {
      kind: 'error',
      retryable: false,
      problem: {
        code: 'cell_write_failed',
        message: `La réponse n’a pas pu être écrite dans la table : ${getErrorMessage(error, 'erreur inconnue')}`,
      },
      response: null,
      latencyMs: result.latencyMs,
    }
  }
  return {
    kind: 'done',
    result: {
      response: null,
      answer: result.answer,
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      latencyMs: result.latencyMs,
    },
  }
}
