/** The endpoints a batch can call, in the OpenAI form a request line names them. */
export const BATCH_ENDPOINTS = ['/v1/chat/completions', '/v1/embeddings'] as const
export type BatchEndpoint = (typeof BATCH_ENDPOINTS)[number]

/** Where each endpoint lives on Nexora API (whose base URL already ends in `/v1`). */
export const UPSTREAM_PATH: Record<BatchEndpoint, string> = {
  '/v1/chat/completions': '/chat/completions',
  '/v1/embeddings': '/embeddings',
}

/** Requests in one batch. */
export const MAX_BATCH_LINES = 10_000
/** Requests waiting in all the open batches of one workspace (or of the instance keys together). */
export const MAX_PENDING_LINES = 50_000
export const MAX_BATCH_FILE_BYTES = 25 * 1024 * 1024
export const MAX_BATCH_LINE_BYTES = 1024 * 1024
export const MAX_REPORTED_LINE_ERRORS = 20

export const DEFAULT_COMPLETION_HOURS = 24
export const MAX_COMPLETION_HOURS = 168

/** Calls of one batch at a time (the instance-wide limiter caps all batches and campaigns together). */
export const DEFAULT_BATCH_CONCURRENCY = 2
export const MAX_BATCH_CONCURRENCY = 4

/** An item is tried this many times before it is given up (restarts and transient errors included). */
export const MAX_ITEM_ATTEMPTS = 3

export type BatchStatus =
  | 'in_progress'
  | 'cancelling'
  | 'completed'
  | 'failed'
  | 'expired'
  | 'cancelled'

export type BatchSource = 'api' | 'table'

export const TERMINAL_BATCH_STATUSES: readonly BatchStatus[] = [
  'completed',
  'failed',
  'expired',
  'cancelled',
]

/** What an error of a batch or of a request is recorded as: an OpenAI-style code and a French message. */
export interface BatchProblem {
  code: string
  message: string
  /** The HTTP status the call answered, when it got that far. */
  status?: number
}
