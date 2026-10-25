import type {
  ChatStreamConfirmationEndFrame,
  ChatStreamConfirmationFrame,
} from '@/lib/workflows/streaming/agent-stream-protocol'

/**
 * Nexora edition: who can answer a confirmation request of a running agent. A chat that streams to
 * a person registers where to send the request (its stream) under the run's execution id; a run
 * nobody follows (schedule, API, editor) registers nothing, and its confirmations are deferred.
 * Kept on `globalThis` so the chat route and the agent loop share it however they were bundled.
 */

export type ConfirmationFrame = ChatStreamConfirmationFrame | ChatStreamConfirmationEndFrame

type ConfirmationSink = (frame: ConfirmationFrame) => void

type SinkGlobal = typeof globalThis & { _nexoraConfirmationSinks?: Map<string, ConfirmationSink> }
const holder = globalThis as SinkGlobal
holder._nexoraConfirmationSinks ??= new Map()
const sinks = holder._nexoraConfirmationSinks

/** Registers the sink of a run; the returned function unregisters it (when the stream ends). */
export function registerConfirmationSink(executionId: string, sink: ConfirmationSink): () => void {
  sinks.set(executionId, sink)
  return () => {
    if (sinks.get(executionId) === sink) sinks.delete(executionId)
  }
}

export function getConfirmationSink(executionId: string | undefined): ConfirmationSink | undefined {
  return executionId ? sinks.get(executionId) : undefined
}
