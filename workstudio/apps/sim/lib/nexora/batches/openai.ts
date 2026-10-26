import { isRecordLike } from '@sim/utils/object'
import {
  errorLine,
  outputLine,
  parseBatchInput,
  parseCompletionWindow,
} from '@/lib/nexora/batches/jsonl'
import type * as repository from '@/lib/nexora/batches/repository'
import type { BatchRecord, FileRecord } from '@/lib/nexora/batches/repository'
import {
  BATCH_ENDPOINTS,
  type BatchEndpoint,
  DEFAULT_BATCH_CONCURRENCY,
  MAX_BATCH_FILE_BYTES,
  MAX_PENDING_LINES,
  resolveFilesQuotaBytes,
} from '@/lib/nexora/batches/types'
import { gatewayErrors } from '@/lib/nexora/developer-api/errors'
import type { GatewayCall } from '@/lib/nexora/developer-api/gateway'
import type { GatewayKey } from '@/lib/nexora/developer-api/policy'

/** What the OpenAI-facing service needs; `live.ts` supplies the real ones, tests their own. */
export interface BatchApiDeps {
  now: () => Date
  repo: Pick<
    typeof repository,
    | 'insertFile'
    | 'getFile'
    | 'getFileText'
    | 'listFiles'
    | 'deleteFile'
    | 'storedFileBytes'
    | 'insertBatchWithItems'
    | 'insertFailedBatch'
    | 'getBatch'
    | 'listBatches'
    | 'pendingLinesInScope'
    | 'requestCancel'
    | 'listResults'
    | 'getResultFileBatch'
  >
  /** Checks the key may call the model (its list, its creator's access group); returns the name usage is recorded under. */
  admitModel: (key: GatewayKey, model: string) => Promise<string>
  modelExists: (model: string) => Promise<boolean>
  /** Starts the background run of a batch in this process (does nothing if it already runs here). */
  start: (batchId: string) => void
  /** Interrupts the calls this process has in flight for a batch. */
  abort: (batchId: string) => void
  /** Waiting requests an instance (or workspace) accepts; {@link MAX_PENDING_LINES} unless a test lowers it. */
  pendingLimit?: number
  /** Bytes of batch files a workspace may keep; 1 Go unless the instance or a test sets another. */
  filesQuotaBytes?: number
}

const MAX_METADATA_KEYS = 16
const MAX_METADATA_KEY_LENGTH = 64
const MAX_METADATA_VALUE_LENGTH = 512
const RESULT_PAGE = 200
const MAX_LIST_LIMIT = 100
const DEFAULT_LIST_LIMIT = 20

/**
 * Files and batches belong to the key that created them, within its workspace (or the instance
 * keys together): another key of the same workspace neither sees nor touches them.
 */
function scopeOf(key: GatewayKey): repository.BatchScope {
  return { workspaceId: key.scope === 'workspace' ? key.workspaceId : null, apiKeyId: key.id }
}

const seconds = (date: Date | null): number | null =>
  date ? Math.floor(date.getTime() / 1000) : null

function fileObject(file: FileRecord) {
  return {
    id: file.id,
    object: 'file' as const,
    bytes: file.bytes,
    created_at: seconds(file.createdAt) ?? 0,
    filename: file.filename,
    purpose: file.purpose,
    status: 'processed' as const,
    expires_at: null,
  }
}

function windowOf(batch: BatchRecord): string {
  const stored = batch.config?.completion_window
  if (typeof stored === 'string') return stored
  const hours = Math.max(
    1,
    Math.round((batch.expiresAt.getTime() - batch.createdAt.getTime()) / 3_600_000)
  )
  return `${hours}h`
}

function batchObject(batch: BatchRecord) {
  const ended = batch.finishedAt
  return {
    id: batch.id,
    object: 'batch' as const,
    endpoint: batch.endpoint,
    model: batch.model,
    errors: batch.errors
      ? {
          object: 'list' as const,
          data: batch.errors.map((entry) => ({
            code: entry.code,
            message: entry.message,
            param: null,
            line: entry.line,
          })),
        }
      : null,
    input_file_id: batch.inputFileId,
    completion_window: windowOf(batch),
    status: batch.status,
    output_file_id: batch.outputFileId,
    error_file_id: batch.errorFileId,
    created_at: seconds(batch.createdAt) ?? 0,
    in_progress_at: seconds(batch.startedAt),
    expires_at: seconds(batch.expiresAt),
    finalizing_at: null,
    completed_at: batch.status === 'completed' ? seconds(ended) : null,
    failed_at: batch.status === 'failed' ? seconds(ended) : null,
    expired_at: batch.status === 'expired' ? seconds(ended) : null,
    cancelling_at: seconds(batch.cancelRequestedAt),
    cancelled_at: batch.status === 'cancelled' ? seconds(ended) : null,
    request_counts: { total: batch.total, completed: batch.completed, failed: batch.failed },
    usage: {
      input_tokens: batch.promptTokens,
      output_tokens: batch.completionTokens,
      total_tokens: batch.promptTokens + batch.completionTokens,
    },
    metadata: batch.metadata,
  }
}

function listObject<T extends { id: string }>(data: T[], hasMore: boolean) {
  return {
    object: 'list' as const,
    data,
    first_id: data[0]?.id ?? null,
    last_id: data.at(-1)?.id ?? null,
    has_more: hasMore,
  }
}

function listLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) return DEFAULT_LIST_LIMIT
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_LIST_LIMIT)
}

export async function createFile(
  call: GatewayCall,
  input: { filename: string; text: string; purpose: string },
  deps: BatchApiDeps
) {
  if (input.purpose !== 'batch') {
    throw gatewayErrors.invalidRequest(
      'Cette instance accepte seulement les fichiers de lot : « purpose » doit valoir « batch ».'
    )
  }
  const bytes = Buffer.byteLength(input.text, 'utf8')
  if (bytes > MAX_BATCH_FILE_BYTES) {
    throw gatewayErrors.batchFileTooLarge(MAX_BATCH_FILE_BYTES / (1024 * 1024))
  }
  const scope = scopeOf(call.key)
  const quota = deps.filesQuotaBytes ?? resolveFilesQuotaBytes(undefined)
  const used = await deps.repo.storedFileBytes(scope)
  if (used + bytes > quota) throw gatewayErrors.batchFilesStorageFull(used, quota)
  const lineCount = input.text.split('\n').filter((line) => line.trim() !== '').length
  const file = await deps.repo.insertFile({
    scope,
    apiKeyId: call.key.id,
    filename: input.filename.slice(0, 255) || 'lot.jsonl',
    text: input.text,
    lineCount,
  })
  return fileObject(file)
}

async function requireFile(call: GatewayCall, fileId: string, deps: BatchApiDeps) {
  const file = await deps.repo.getFile(scopeOf(call.key), fileId)
  if (!file) throw gatewayErrors.fileNotFound(fileId)
  return file
}

export async function retrieveFile(call: GatewayCall, fileId: string, deps: BatchApiDeps) {
  return fileObject(await requireFile(call, fileId, deps))
}

export async function listFiles(
  call: GatewayCall,
  query: { purpose?: string; limit?: number; after?: string },
  deps: BatchApiDeps
) {
  const page = await deps.repo.listFiles(scopeOf(call.key), {
    purpose: query.purpose,
    limit: listLimit(query.limit),
    after: query.after,
  })
  return listObject(page.files.map(fileObject), page.hasMore)
}

export async function deleteFile(call: GatewayCall, fileId: string, deps: BatchApiDeps) {
  const deleted = await deps.repo.deleteFile(scopeOf(call.key), fileId)
  if (!deleted) throw gatewayErrors.fileNotFound(fileId)
  return { id: fileId, object: 'file' as const, deleted: true }
}

/** The lines of a batch's output or error file, read page by page from its results. */
function resultStream(
  batchId: string,
  kind: 'output' | 'error',
  deps: BatchApiDeps
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let after = -1
  let finished = false
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (!finished) {
        const rows = await deps.repo.listResults(batchId, kind, after, RESULT_PAGE)
        if (rows.length < RESULT_PAGE) finished = true
        if (rows.length === 0) break
        after = rows[rows.length - 1].position
        const lines: string[] = []
        for (const row of rows) {
          if (kind === 'output' && row.response) {
            lines.push(outputLine({ id: row.id, customId: row.customId, response: row.response }))
          } else if (kind === 'error') {
            lines.push(
              errorLine({
                id: row.id,
                customId: row.customId,
                response: row.response,
                error: row.error ?? { code: 'unknown_error', message: 'Erreur inconnue.' },
              })
            )
          }
        }
        if (lines.length > 0) {
          controller.enqueue(encoder.encode(`${lines.join('\n')}\n`))
          return
        }
      }
      controller.close()
    },
  })
}

/** The content of a file: an input file's text, or a batch's output or error lines. */
export async function readFileContent(
  call: GatewayCall,
  fileId: string,
  deps: BatchApiDeps
): Promise<{ body: string | ReadableStream<Uint8Array>; contentType: string }> {
  const scope = scopeOf(call.key)
  const file = await requireFile(call, fileId, deps)
  if (file.purpose === 'batch_output') {
    const route = await deps.repo.getResultFileBatch(scope, fileId)
    if (!route) throw gatewayErrors.fileNotFound(fileId)
    return { body: resultStream(route.batchId, route.kind, deps), contentType: 'application/jsonl' }
  }
  const text = await deps.repo.getFileText(scope, fileId)
  if (text === null) throw gatewayErrors.fileNotFound(fileId)
  return { body: text, contentType: 'application/jsonl' }
}

function readMetadata(value: unknown): Record<string, string> | null {
  if (value === undefined || value === null) return null
  if (!isRecordLike(value)) {
    throw gatewayErrors.invalidRequest('« metadata » doit être un objet de textes.')
  }
  const entries = Object.entries(value)
  if (entries.length > MAX_METADATA_KEYS) {
    throw gatewayErrors.invalidRequest(`« metadata » accepte ${MAX_METADATA_KEYS} clés au plus.`)
  }
  for (const [key, entry] of entries) {
    if (typeof entry !== 'string') {
      throw gatewayErrors.invalidRequest(`« metadata.${key} » doit être un texte.`)
    }
    if (key.length > MAX_METADATA_KEY_LENGTH || entry.length > MAX_METADATA_VALUE_LENGTH) {
      throw gatewayErrors.invalidRequest(
        `« metadata » : clés de ${MAX_METADATA_KEY_LENGTH} caractères et valeurs de ${MAX_METADATA_VALUE_LENGTH} au plus.`
      )
    }
  }
  return Object.fromEntries(entries as [string, string][])
}

export async function createBatch(
  call: GatewayCall,
  body: {
    input_file_id: string
    endpoint: string
    completion_window?: unknown
    metadata?: unknown
  },
  deps: BatchApiDeps
) {
  if (!(BATCH_ENDPOINTS as readonly string[]).includes(body.endpoint)) {
    throw gatewayErrors.invalidRequest(
      `« endpoint » doit valoir ${BATCH_ENDPOINTS.join(' ou ')}.`,
      'invalid_endpoint'
    )
  }
  const endpoint = body.endpoint as BatchEndpoint
  const window = parseCompletionWindow(body.completion_window)
  if (!window.ok) throw gatewayErrors.invalidRequest(window.message, 'invalid_completion_window')
  const metadata = readMetadata(body.metadata)

  const scope = scopeOf(call.key)
  const file = await requireFile(call, body.input_file_id, deps)
  if (file.purpose !== 'batch') {
    throw gatewayErrors.invalidRequest(
      'Ce fichier est un résultat de lot : un lot se lance à partir d’un fichier de purpose « batch ».'
    )
  }
  const text = await deps.repo.getFileText(scope, file.id)
  if (text === null) throw gatewayErrors.fileNotFound(file.id)

  const now = deps.now()
  const base = {
    scope,
    apiKeyId: call.key.id,
    createdBy: null,
    source: 'api' as const,
    endpoint,
    inputFileId: file.id,
    metadata,
    config: {
      completion_window:
        typeof body.completion_window === 'string' ? body.completion_window : '24h',
    },
    concurrency: DEFAULT_BATCH_CONCURRENCY,
    expiresAt: new Date(now.getTime() + window.hours * 3_600_000),
  }

  const parsed = parseBatchInput(text, endpoint)
  if (!parsed.ok) {
    return batchObject(
      await deps.repo.insertFailedBatch({ ...base, model: 'inconnu' }, parsed.errors)
    )
  }

  await deps.admitModel(call.key, parsed.model)
  if (!(await deps.modelExists(parsed.model))) throw gatewayErrors.modelNotFound(parsed.model)
  const limit = deps.pendingLimit ?? MAX_PENDING_LINES
  const waiting = await deps.repo.pendingLinesInScope(scope)
  if (waiting + parsed.lines.length > limit) throw gatewayErrors.batchQueueFull(waiting, limit)

  const batch = await deps.repo.insertBatchWithItems(
    { ...base, model: parsed.model },
    parsed.lines.map((line) => ({
      position: line.position,
      customId: line.customId,
      request: line.body,
    }))
  )
  deps.start(batch.id)
  return batchObject(batch)
}

async function requireBatch(call: GatewayCall, batchId: string, deps: BatchApiDeps) {
  const batch = await deps.repo.getBatch(scopeOf(call.key), batchId)
  if (!batch || batch.source !== 'api') throw gatewayErrors.batchNotFound(batchId)
  return batch
}

export async function retrieveBatch(call: GatewayCall, batchId: string, deps: BatchApiDeps) {
  return batchObject(await requireBatch(call, batchId, deps))
}

export async function listBatches(
  call: GatewayCall,
  query: { limit?: number; after?: string },
  deps: BatchApiDeps
) {
  const page = await deps.repo.listBatches(scopeOf(call.key), {
    limit: listLimit(query.limit),
    after: query.after,
    source: 'api',
  })
  return listObject(page.batches.map(batchObject), page.hasMore)
}

/**
 * Asks a running batch to stop: `cancelling` at once, `cancelled` when the calls in flight are
 * interrupted and the remaining requests are marked. A batch that ended cannot be cancelled (409).
 */
export async function cancelBatch(call: GatewayCall, batchId: string, deps: BatchApiDeps) {
  const current = await requireBatch(call, batchId, deps)
  if (current.status !== 'in_progress' && current.status !== 'cancelling') {
    throw gatewayErrors.batchNotCancellable(current.status)
  }
  const batch = await deps.repo.requestCancel(scopeOf(call.key), batchId, deps.now())
  if (!batch) throw gatewayErrors.batchNotFound(batchId)
  deps.abort(batchId)
  // A batch nobody runs (its server stopped) is adopted here so that it can end.
  deps.start(batchId)
  return batchObject(batch)
}
