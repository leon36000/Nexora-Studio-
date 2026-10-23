import { createLogger } from '@sim/logger'
import { isRecordLike } from '@sim/utils/object'
import {
  continueOutboxHandler,
  deferOutboxHandler,
  type OutboxHandler,
  type OutboxHandlerRegistry,
  withOutboxHandlerTimeout,
} from '@/lib/core/outbox/service'
import { decideKnowledgeReindexFailure } from '@/lib/knowledge/reindex/failure'
import { KNOWLEDGE_REINDEX_EVENT } from '@/lib/knowledge/reindex/outbox-event'
import {
  failKnowledgeReindex,
  runKnowledgeReindexSlice,
  touchKnowledgeReindex,
} from '@/lib/knowledge/reindex/service'

const logger = createLogger('KnowledgeReindexOutbox')

/** A slice ends a minute before this to save its progress; the outbox reaps a lease after it. */
const REINDEX_HANDLER_TIMEOUT_MS = 550_000

interface KnowledgeReindexPayload {
  knowledgeBaseId: string
  generation: string
  /** When the embedding server stopped answering, while the reindex waits for it. */
  waitingSince: number | null
}

function parsePayload(payload: unknown): KnowledgeReindexPayload {
  if (
    !isRecordLike(payload) ||
    typeof payload.knowledgeBaseId !== 'string' ||
    typeof payload.generation !== 'string'
  ) {
    throw new Error('Knowledge reindex payload must name a knowledge base and a generation')
  }
  const waitingSince =
    typeof payload.waitingSince === 'string' ? Date.parse(payload.waitingSince) : Number.NaN
  return {
    knowledgeBaseId: payload.knowledgeBaseId,
    generation: payload.generation,
    waitingSince: Number.isFinite(waitingSince) ? waitingSince : null,
  }
}

/**
 * Runs one slice and decides what comes next: another slice right away while chunks remain; a
 * wait, spending no attempt, while the embedding server is down or too slow (for a bounded
 * window); a retry for another failure; and on the last attempt (or a failure that cannot fix
 * itself) a failed reindex that leaves the base on its current index.
 */
const reindexKnowledgeBase: OutboxHandler<unknown> = async (rawPayload, context) => {
  const { knowledgeBaseId, generation, waitingSince } = parsePayload(rawPayload)
  const lastAttempt = context.attempts + 1 >= context.maxAttempts
  let outcome: Awaited<ReturnType<typeof runKnowledgeReindexSlice>>
  try {
    outcome = await runKnowledgeReindexSlice(knowledgeBaseId, generation, {
      signal: context.signal,
      deadlineAt: context.deadlineAt,
    })
  } catch (error) {
    context.signal.throwIfAborted()
    const decision = decideKnowledgeReindexFailure(error, {
      now: Date.now(),
      waitingSince,
      lastAttempt,
    })
    if (decision.action === 'wait') {
      if (waitingSince === null) {
        await context.checkpointPayload({ waitingSince: new Date(decision.since).toISOString() })
      }
      await touchKnowledgeReindex(knowledgeBaseId, generation)
      logger.info('Knowledge reindex waits for the embedding server', { knowledgeBaseId })
      return deferOutboxHandler('Waiting for the embedding server', decision.backoffMs, false)
    }
    if (decision.action === 'retry') throw error
    logger.warn('Knowledge reindex stops', { knowledgeBaseId, code: decision.failure.code })
    await failKnowledgeReindex(knowledgeBaseId, generation, decision.failure)
    return
  }
  if (waitingSince !== null) await context.checkpointPayload({ waitingSince: null })
  if (outcome === 'continue') {
    return continueOutboxHandler('Knowledge reindex continues in the next slice', 1000)
  }
  if (outcome === 'busy') {
    if (!lastAttempt) return deferOutboxHandler('Knowledge base busy at the switch', 30_000)
    await failKnowledgeReindex(knowledgeBaseId, generation, {
      code: 'failed',
      message:
        'The knowledge base stayed busy while switching to the new model; start the reindex again',
    })
  }
}

export const knowledgeReindexOutboxHandlers = {
  [KNOWLEDGE_REINDEX_EVENT]: withOutboxHandlerTimeout(
    reindexKnowledgeBase,
    REINDEX_HANDLER_TIMEOUT_MS
  ),
} satisfies OutboxHandlerRegistry
