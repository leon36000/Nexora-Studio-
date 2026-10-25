import type {
  ChatStreamConfirmationEndFrame,
  ChatStreamConfirmationFrame,
  ChatStreamDelegationFrame,
} from '@/lib/workflows/streaming/agent-stream-protocol'

/**
 * Nexora edition: who can answer a confirmation request of a running agent. A chat that streams to
 * a person registers where to send the request (its stream) under the run's execution id; a run
 * nobody follows (schedule, API, editor) registers nothing, and its confirmations are deferred.
 * The same channel carries the delegation frames (« Agent tarifs répond… ») to that person.
 * Kept on `globalThis` so the chat route and the agent loop share it however they were bundled.
 */

export type ConfirmationFrame =
  | ChatStreamConfirmationFrame
  | ChatStreamConfirmationEndFrame
  | ChatStreamDelegationFrame

type ConfirmationSink = (frame: ConfirmationFrame) => void

interface RegisteredSink {
  sink: ConfirmationSink
  followerMayAnswer: boolean
}

type SinkGlobal = typeof globalThis & { _nexoraConfirmationSinks?: Map<string, RegisteredSink> }
const holder = globalThis as SinkGlobal
holder._nexoraConfirmationSinks ??= new Map()
const sinks = holder._nexoraConfirmationSinks

/**
 * Registers the sink of a run; the returned function unregisters it (when the stream ends).
 * `followerMayAnswer` says whether the person on the other end of the stream may allow the run's
 * actions: a member of the workspace may; the visitor of a public chat may not, since he would be
 * approving what his own request made the workspace's connections do. Closed unless granted.
 */
export function registerConfirmationSink(
  executionId: string,
  sink: ConfirmationSink,
  options: { followerMayAnswer?: boolean } = {}
): () => void {
  const registered: RegisteredSink = { sink, followerMayAnswer: options.followerMayAnswer === true }
  sinks.set(executionId, registered)
  return () => {
    if (sinks.get(executionId) === registered) sinks.delete(executionId)
  }
}

export function getConfirmationSink(executionId: string | undefined): ConfirmationSink | undefined {
  return executionId ? sinks.get(executionId)?.sink : undefined
}

/** Whether the person following this run may answer « Autoriser » for it (never a public visitor). */
export function followerMayAnswer(executionId: string | undefined): boolean {
  return executionId ? sinks.get(executionId)?.followerMayAnswer === true : false
}
