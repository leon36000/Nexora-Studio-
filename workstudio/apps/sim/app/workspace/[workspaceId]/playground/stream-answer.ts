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
  | 'forbidden'
  | 'invalid'
  | 'interrupted'
  | 'unknown'

export type PlaygroundOutcome =
  | { status: 'done'; usage: PlaygroundUsage | null }
  | { status: 'stopped' }
  | { status: 'error'; code: PlaygroundErrorCode }

interface StreamAnswerInput {
  body: ContractBodyInput<typeof playgroundContract>
  signal: AbortSignal
  onChunk: (text: string) => void
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
 * Streams one Playground answer: `data: {"chunk"}` events, then `data: {"done", "usage"}` (or
 * `{"error", "done"}`). Never throws: aborting `signal` ends with `stopped`, a stream that ends
 * without its final event with `interrupted`.
 */
export async function streamPlaygroundAnswer({
  body,
  signal,
  onChunk,
}: StreamAnswerInput): Promise<PlaygroundOutcome> {
  let finished = false
  let failed = false
  let usage: PlaygroundUsage | null = null
  try {
    const response = await requestRaw(playgroundContract, { body, signal })
    await readSSEEvents<unknown>(response, {
      signal,
      onEvent: (raw) => {
        const event = toRecord(raw)
        const chunk = toStringOrNull(event.chunk)
        if (chunk) onChunk(chunk)
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
    return { status: 'error', code: toErrorCode(error) }
  }
  if (signal.aborted) return { status: 'stopped' }
  if (failed || !finished) return { status: 'error', code: 'interrupted' }
  return { status: 'done', usage }
}
