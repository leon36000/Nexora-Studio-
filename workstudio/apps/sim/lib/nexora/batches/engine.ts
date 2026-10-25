import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import type {
  BatchOutcome,
  BatchRecord,
  ItemRecord,
  ItemSuccess,
} from '@/lib/nexora/batches/repository'
import {
  type BatchProblem,
  type BatchStatus,
  MAX_BATCH_CONCURRENCY,
  MAX_ITEM_ATTEMPTS,
} from '@/lib/nexora/batches/types'
import { INTERACTIVE_WAIT_MAX_MS, type Limiter } from '@/lib/nexora/evaluations/runner'

const logger = createLogger('NexoraBatchEngine')

const INTERACTIVE_POLL_MS = 2_000
const HEARTBEAT_EVERY_MS = 30_000
const RETRY_BACKOFF_MS = 2_000
const RETRY_BACKOFF_MAX_MS = 10_000

/** What running one request came to. */
export type ItemOutcome =
  | { kind: 'done'; result: ItemSuccess }
  | {
      kind: 'error'
      problem: BatchProblem
      response: ItemSuccess['response']
      latencyMs: number | null
      /** A transient failure (model busy, network): the request is tried again. */
      retryable: boolean
    }
  /** The call was interrupted on purpose (cancel, shutdown): the request goes back in the queue. */
  | { kind: 'aborted' }
  /** The whole batch must stop (the monthly budget is reached): this request goes back in the queue. */
  | { kind: 'stop'; code: string; message: string }

/** The part of the repository the engine uses (an in-memory copy stands in for it in tests). */
export interface EngineStore {
  acquireBatch: (
    batchId: string,
    owner: string,
    now: Date,
    leaseUntil: Date
  ) => Promise<{ batch: BatchRecord; resumed: boolean } | null>
  heartbeat: (batchId: string, owner: string, leaseUntil: Date) => Promise<BatchStatus | null>
  claimNextItem: (batchId: string, now: Date) => Promise<ItemRecord | null>
  completeItem: (itemId: string, result: ItemSuccess, now: Date) => Promise<boolean>
  failItem: (
    itemId: string,
    problem: BatchProblem,
    response: ItemSuccess['response'],
    latencyMs: number | null,
    now: Date
  ) => Promise<boolean>
  releaseItem: (itemId: string, attempted?: boolean) => Promise<void>
  countOpenItems: (batchId: string) => Promise<number>
  finishBatch: (
    batchId: string,
    owner: string,
    outcome: BatchOutcome,
    now: Date,
    errors?: { code: string; message: string; line: number | null }[]
  ) => Promise<boolean>
}

export interface EngineDeps {
  store: EngineStore
  /** Identifies this process as the batch's runner (its lease). */
  owner: string
  leaseMs: number
  now: () => Date
  sleep: (ms: number) => Promise<void>
  /** Calls `run` every `ms` until the returned function is called: keeps the lease alive. */
  every: (ms: number, run: () => Promise<void>) => () => void
  /** The instance-wide cap on background model calls, shared with the evaluation campaigns. */
  limiter: Limiter
  interactiveBusy: () => Promise<boolean>
  executeItem: (batch: BatchRecord, item: ItemRecord, signal: AbortSignal) => Promise<ItemOutcome>
  /** Aborts every in-flight call (the process is shutting the batch down). */
  externalSignal?: AbortSignal
}

export type BatchRunOutcome =
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'failed'
  | 'interrupted'
  | 'skipped'

/**
 * Runs a batch to its end in this process, at low priority: it takes the batch's lease, then
 * `concurrency` workers (never more calls at once than the shared limiter allows) claim requests
 * one at a time, wait for the interactive load (up to {@link INTERACTIVE_WAIT_MAX_MS} per
 * request), run them and store the result. Between requests the lease is renewed, which is also how
 * a cancellation is noticed (calls in flight are then aborted). A transient failure is tried again
 * up to {@link MAX_ITEM_ATTEMPTS} times. A batch whose lease was lost is left to the process that
 * adopts it; a batch past its time ends `expired`, keeping what was answered.
 */
export async function runBatch(batchId: string, deps: EngineDeps): Promise<BatchRunOutcome> {
  const { store } = deps
  const leaseUntil = () => new Date(deps.now().getTime() + deps.leaseMs)
  const acquired = await store.acquireBatch(batchId, deps.owner, deps.now(), leaseUntil())
  if (!acquired) return 'skipped'
  const { batch } = acquired

  const controller = new AbortController()
  deps.externalSignal?.addEventListener('abort', () => controller.abort(), { once: true })
  const state = {
    stop: false,
    cancelled: batch.status === 'cancelling',
    lost: false,
    expired: false,
    stopProblem: null as { code: string; message: string } | null,
  }
  if (state.cancelled) state.stop = true

  const checkExpiry = () => {
    if (deps.now().getTime() >= batch.expiresAt.getTime()) {
      state.expired = true
      state.stop = true
      controller.abort()
    }
  }

  /** Renews the lease and learns whether the batch was cancelled or taken over meanwhile. */
  const renewLease = async (): Promise<boolean> => {
    const status = await store.heartbeat(batchId, deps.owner, leaseUntil())
    if (status === 'in_progress') return true
    if (status === 'cancelling') state.cancelled = true
    else state.lost = true
    state.stop = true
    controller.abort()
    return false
  }
  const stopHeartbeat = deps.every(HEARTBEAT_EVERY_MS, async () => {
    if (!state.stop) await renewLease()
  })

  const waitForInteractiveIdle = async () => {
    let waited = 0
    while (waited < INTERACTIVE_WAIT_MAX_MS && !state.stop && (await deps.interactiveBusy())) {
      await deps.sleep(INTERACTIVE_POLL_MS)
      waited += INTERACTIVE_POLL_MS
    }
  }

  const processItem = async (item: ItemRecord) => {
    let outcome: ItemOutcome
    try {
      outcome = await deps.executeItem(batch, item, controller.signal)
    } catch (error) {
      if (controller.signal.aborted) outcome = { kind: 'aborted' }
      else {
        logger.error('Batch request crashed', { batchId, error: getErrorMessage(error) })
        outcome = {
          kind: 'error',
          retryable: false,
          problem: {
            code: 'internal_error',
            message: getErrorMessage(error, 'Erreur interne pendant l’exécution de la requête.'),
          },
          response: null,
          latencyMs: null,
        }
      }
    }
    switch (outcome.kind) {
      case 'done':
        await store.completeItem(item.id, outcome.result, deps.now())
        return
      case 'aborted':
        await store.releaseItem(item.id)
        return
      case 'stop':
        state.stopProblem ??= { code: outcome.code, message: outcome.message }
        state.stop = true
        await store.releaseItem(item.id)
        return
      case 'error':
        if (outcome.retryable && item.attempt < MAX_ITEM_ATTEMPTS) {
          await store.releaseItem(item.id, true)
          await deps.sleep(Math.min(RETRY_BACKOFF_MS * item.attempt, RETRY_BACKOFF_MAX_MS))
        } else {
          await store.failItem(
            item.id,
            outcome.problem,
            outcome.response,
            outcome.latencyMs,
            deps.now()
          )
        }
    }
  }

  const worker = async () => {
    while (!state.stop) {
      if (!(await renewLease())) break
      checkExpiry()
      if (state.stop) break
      let release: (() => void) | null = null
      try {
        release = await deps.limiter.acquire(controller.signal)
      } catch {
        break
      }
      try {
        if (state.stop) break
        const item = await store.claimNextItem(batchId, deps.now())
        if (!item) break
        // Waiting happens once a request is in hand, so a worker that finds the queue empty never waits.
        await waitForInteractiveIdle()
        if (state.stop) {
          await store.releaseItem(item.id)
          break
        }
        await processItem(item)
      } finally {
        release()
      }
    }
  }

  try {
    if (!state.cancelled) checkExpiry()
    const workers = state.stop ? 0 : Math.max(1, Math.min(batch.concurrency, MAX_BATCH_CONCURRENCY))
    await Promise.all(Array.from({ length: workers }, worker))

    if (controller.signal.aborted && !state.cancelled && !state.lost && !state.expired) {
      await renewLease()
    }
    if (state.lost) return 'interrupted'
    const now = deps.now()
    if (state.cancelled) {
      return (await store.finishBatch(batchId, deps.owner, 'cancelled', now))
        ? 'cancelled'
        : 'skipped'
    }
    if (state.expired) {
      return (await store.finishBatch(batchId, deps.owner, 'expired', now)) ? 'expired' : 'skipped'
    }
    if (state.stopProblem) {
      const finished = await store.finishBatch(batchId, deps.owner, 'failed', now, [
        { ...state.stopProblem, line: null },
      ])
      return finished ? 'failed' : 'skipped'
    }
    if (controller.signal.aborted || (await store.countOpenItems(batchId)) > 0) return 'interrupted'
    return (await store.finishBatch(batchId, deps.owner, 'completed', now))
      ? 'completed'
      : 'skipped'
  } catch (error) {
    logger.error('Batch failed', { batchId, error: getErrorMessage(error) })
    await store
      .finishBatch(batchId, deps.owner, 'failed', deps.now(), [
        { code: 'internal_error', message: getErrorMessage(error, 'Échec du lot.'), line: null },
      ])
      .catch(() => false)
    return 'failed'
  } finally {
    stopHeartbeat()
  }
}
