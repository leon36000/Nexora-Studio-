import { createLogger } from '@sim/logger'
import { isRecordLike } from '@sim/utils/object'
import {
  continueOutboxHandler,
  deferOutboxHandler,
  type OutboxHandler,
  type OutboxHandlerRegistry,
  withOutboxHandlerTimeout,
} from '@/lib/core/outbox/service'
import { KNOWLEDGE_REINDEX_EVENT } from '@/lib/knowledge/reindex/outbox-event'
import {
  classifyKnowledgeReindexFailure,
  failKnowledgeReindex,
  runKnowledgeReindexSlice,
} from '@/lib/knowledge/reindex/service'

const logger = createLogger('KnowledgeReindexOutbox')

/** A slice ends a minute before this to save its progress; the outbox reaps a lease after it. */
const REINDEX_HANDLER_TIMEOUT_MS = 550_000

function parsePayload(payload: unknown): { knowledgeBaseId: string; generation: string } {
  if (
    !isRecordLike(payload) ||
    typeof payload.knowledgeBaseId !== 'string' ||
    typeof payload.generation !== 'string'
  ) {
    throw new Error('Knowledge reindex payload must name a knowledge base and a generation')
  }
  return { knowledgeBaseId: payload.knowledgeBaseId, generation: payload.generation }
}

/**
 * Runs one slice and decides what comes next: another slice right away while chunks remain, a
 * retry while the model server is unreachable, and on the last attempt (or a failure that cannot
 * fix itself) a failed reindex that leaves the base on its current index.
 */
const reindexKnowledgeBase: OutboxHandler<unknown> = async (rawPayload, context) => {
  const { knowledgeBaseId, generation } = parsePayload(rawPayload)
  const lastAttempt = context.attempts + 1 >= context.maxAttempts
  let outcome: Awaited<ReturnType<typeof runKnowledgeReindexSlice>>
  try {
    outcome = await runKnowledgeReindexSlice(knowledgeBaseId, generation, {
      signal: context.signal,
      deadlineAt: context.deadlineAt,
    })
  } catch (error) {
    context.signal.throwIfAborted()
    const failure = classifyKnowledgeReindexFailure(error)
    if (failure.transient && !lastAttempt) throw error
    logger.warn('Knowledge reindex stops', { knowledgeBaseId, code: failure.code })
    await failKnowledgeReindex(knowledgeBaseId, generation, failure)
    return
  }
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
