import { toStringOrNull } from '@sim/utils/coerce'
import { isRecordLike } from '@sim/utils/object'
import { isApiClientError, isValidationError } from '@/lib/api/client/errors'
import { requestRaw } from '@/lib/api/client/request'
import { type DeployedChatPostBody, deployedChatPostContract } from '@/lib/api/contracts/chats'
import { readSSEEvents } from '@/lib/core/utils/sse'
import {
  AGENT_STREAM_PROTOCOL_HEADER_LABEL,
  AGENT_STREAM_PROTOCOL_V1,
  isChatChunkFrame,
  isChatChunkResetFrame,
  isChatErrorFrame,
  isChatFinalFrame,
  isChatThinkingFrame,
} from '@/lib/workflows/streaming/agent-stream-protocol'

/** Why an answer failed, worded by the Assistant page. */
export type ReplyErrorCode =
  | 'agent-unavailable'
  | 'forbidden'
  | 'rate-limited'
  | 'invalid'
  | 'failed'
  | 'interrupted'
  | 'unknown'

/** How an answer ended, with the text received until then. */
export type ReplyOutcome =
  | { status: 'done'; text: string }
  | { status: 'stopped'; text: string }
  | { status: 'error'; code: ReplyErrorCode; text: string }

interface StreamAgentReplyInput {
  /** The agent's deployed chat (`/api/chat/[identifier]`). */
  chatIdentifier: string
  body: Pick<DeployedChatPostBody, 'input' | 'conversationId' | 'files'>
  signal: AbortSignal
  /** Called with the whole answer text so far, each time it grows or shrinks. */
  onText: (text: string) => void
  /** Called with the whole reasoning so far, for an agent whose chat shares it. */
  onThinking?: (thinking: string) => void
}

function toErrorCode(error: unknown): ReplyErrorCode {
  if (isApiClientError(error)) {
    if (error.status === 404 || error.status === 403) return 'agent-unavailable'
    if (error.status === 401) return 'forbidden'
    if (error.status === 429) return 'rate-limited'
    if (error.status === 400 || error.status === 413) return 'invalid'
  }
  return isValidationError(error) ? 'invalid' : 'unknown'
}

/** The first text a run produced, for an answer that was not streamed chunk by chunk. */
function finalOutputText(output: unknown): string {
  if (!isRecordLike(output)) return ''
  for (const value of Object.values(output)) {
    const text =
      toStringOrNull(value) ?? (isRecordLike(value) ? toStringOrNull(value.content) : null)
    if (text?.trim()) return text
  }
  return ''
}

/**
 * Sends one question to an agent's deployed chat and follows its answer stream: text chunks per
 * block (a `chunk_reset` drops the block's text of an intermediate tool-calling turn), a
 * reasoning model's `thinking` frames apart from them, then one terminal `final` or `error` frame. Never throws: aborting `signal` ends with `stopped`, a stream
 * that closes without its terminal frame with `interrupted`; every outcome carries the text so far.
 */
export async function streamAgentReply({
  chatIdentifier,
  body,
  signal,
  onText,
  onThinking,
}: StreamAgentReplyInput): Promise<ReplyOutcome> {
  let thinking = ''
  const blockOrder: string[] = []
  const blockText = new Map<string, string>()
  let text = ''
  const ending: { terminal: 'done' | 'failed' | null } = { terminal: null }

  const publish = () => {
    text = blockOrder.map((blockId) => blockText.get(blockId) ?? '').join('')
    onText(text)
  }

  try {
    const response = await requestRaw(
      deployedChatPostContract,
      { params: { identifier: chatIdentifier }, body, signal },
      { headers: { [AGENT_STREAM_PROTOCOL_HEADER_LABEL]: AGENT_STREAM_PROTOCOL_V1 } }
    )
    await readSSEEvents<unknown>(response, {
      signal,
      onEvent: (frame) => {
        if (isChatChunkFrame(frame)) {
          if (!blockText.has(frame.blockId)) blockOrder.push(frame.blockId)
          blockText.set(frame.blockId, (blockText.get(frame.blockId) ?? '') + frame.chunk)
          publish()
          return false
        }
        if (isChatThinkingFrame(frame)) {
          thinking += frame.data
          onThinking?.(thinking)
          return false
        }
        if (isChatChunkResetFrame(frame)) {
          if (!blockText.has(frame.blockId)) return false
          blockText.delete(frame.blockId)
          blockOrder.splice(blockOrder.indexOf(frame.blockId), 1)
          publish()
          return false
        }
        if (isChatErrorFrame(frame)) {
          ending.terminal = 'failed'
          return true
        }
        if (isChatFinalFrame(frame)) {
          const data = frame.data as { success?: unknown; output?: unknown }
          if (data.success === false) {
            ending.terminal = 'failed'
            return true
          }
          if (!text.trim()) {
            const fallback = finalOutputText(data.output)
            if (fallback) {
              text = fallback
              onText(text)
            }
          }
          ending.terminal = 'done'
          return true
        }
        return false
      },
    })
  } catch (error) {
    if (signal.aborted) return { status: 'stopped', text }
    return { status: 'error', code: toErrorCode(error), text }
  }
  if (signal.aborted) return { status: 'stopped', text }
  if (ending.terminal === null) return { status: 'error', code: 'interrupted', text }
  if (ending.terminal === 'failed') return { status: 'error', code: 'failed', text }
  return { status: 'done', text }
}
