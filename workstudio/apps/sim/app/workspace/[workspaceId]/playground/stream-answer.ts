import { toNumberOrNull, toStringOrNull } from '@sim/utils/coerce'
import { isRecordLike, toRecord } from '@sim/utils/object'
import { isApiClientError, isValidationError } from '@/lib/api/client/errors'
import { requestRaw } from '@/lib/api/client/request'
import type { ContractBodyInput } from '@/lib/api/contracts'
import { playgroundContract } from '@/lib/api/contracts/nexora-playground'
import { readSSEEvents } from '@/lib/core/utils/sse'

export interface PlaygroundUsage {
  promptTokens: number
  completionTokens: number
}

/** Why an answer failed, worded by the Playground. */
export type PlaygroundErrorCode =
  | 'unavailable'
  | 'rejected'
  | 'forbidden'
  | 'invalid'
  | 'interrupted'
  | 'unknown'

export type PlaygroundOutcome =
  | {
      status: 'done'
      usage: PlaygroundUsage | null
      /** The model refused the reasoning effort; it answered with its own default. */
      effortIgnored: boolean
    }
  | { status: 'stopped' }
  | { status: 'error'; code: PlaygroundErrorCode; reason?: string }

interface StreamAnswerInput {
  body: ContractBodyInput<typeof playgroundContract>
  signal: AbortSignal
  onChunk: (text: string) => void
  /** A reasoning model's reasoning, which never comes through `onChunk`. */
  onThinking?: (text: string) => void
}

function toError(error: unknown): Extract<PlaygroundOutcome, { status: 'error' }> {
  if (isApiClientError(error) && error.status === 422) {
    const reason = toStringOrNull(toRecord(error.body).reason)
    return reason
      ? { status: 'error', code: 'rejected', reason }
      : { status: 'error', code: 'invalid' }
  }
  return { status: 'error', code: toErrorCode(error) }
}

function toErrorCode(error: unknown): PlaygroundErrorCode {
  if (isApiClientError(error)) {
    if (error.status === 503) return 'unavailable'
    if (error.status === 401 || error.status === 403) return 'forbidden'
    if (error.status === 400) return 'invalid'
  }
  return isValidationError(error) ? 'invalid' : 'unknown'
}

/**
 * Streams one Playground answer: `data: {"thinking"}` and `data: {"chunk"}` events, then
 * `data: {"done", "usage"}` (or `{"error", "done"}`). Never throws: aborting `signal` ends with
 * `stopped`, a stream that ends without its final event with `interrupted`.
 */
export async function streamPlaygroundAnswer({
  body,
  signal,
  onChunk,
  onThinking,
}: StreamAnswerInput): Promise<PlaygroundOutcome> {
  let finished = false
  let failed = false
  let effortIgnored = false
  let usage: PlaygroundUsage | null = null
  try {
    const response = await requestRaw(playgroundContract, { body, signal })
    await readSSEEvents<unknown>(response, {
      signal,
      onEvent: (raw) => {
        const event = toRecord(raw)
        const thinking = toStringOrNull(event.thinking)
        if (thinking) onThinking?.(thinking)
        const chunk = toStringOrNull(event.chunk)
        if (chunk) onChunk(chunk)
        if (event.effortIgnored === true) effortIgnored = true
        if (toStringOrNull(event.error)) failed = true
        if (isRecordLike(event.usage)) {
          usage = {
            promptTokens: toNumberOrNull(event.usage.promptTokens) ?? 0,
            completionTokens: toNumberOrNull(event.usage.completionTokens) ?? 0,
          }
        }
        if (event.done !== true) return false
        finished = true
        return true
      },
    })
  } catch (error) {
    if (signal.aborted) return { status: 'stopped' }
    return toError(error)
  }
  if (signal.aborted) return { status: 'stopped' }
  if (failed || !finished) return { status: 'error', code: 'interrupted' }
  return { status: 'done', usage, effortIgnored }
}
