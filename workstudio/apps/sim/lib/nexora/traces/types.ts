/**
 * Nexora edition: the normalized trace a source hands to the collector. Sources (the execution
 * log, a direct model call) build a {@link TraceDraft}; the collector masks, caps and stores it.
 */
export type TraceSource =
  | 'playground'
  | 'agent'
  | 'assistant'
  | 'copilot'
  | 'wand'
  | 'workflow'
  | 'api_key'

/** `workspace`: every member of the workspace; `private`: its author and the workspace admins. */
export type TraceVisibility = 'workspace' | 'private'

export type SpanKind = 'model' | 'tool' | 'knowledge' | 'delegation' | 'step'

export type TraceStatus = 'ok' | 'error'

export interface SpanDraft {
  /** 16 hex characters (OTLP span id). */
  id: string
  parentId: string | null
  kind: SpanKind
  name: string
  model: string | null
  startedAt: Date
  durationMs: number
  status: TraceStatus
  inputTokens: number
  outputTokens: number
  input: string | null
  output: string | null
  attributes: Record<string, unknown>
}

export interface TraceDraft {
  /** 32 hex characters (OTLP trace id). */
  id: string
  workspaceId: string | null
  userId: string | null
  source: TraceSource
  visibility: TraceVisibility
  name: string
  agentId: string | null
  agentName: string | null
  apiKeyId: string | null
  executionId: string | null
  status: TraceStatus
  error: string | null
  startedAt: Date
  durationMs: number
  inputTokens: number
  outputTokens: number
  /** What was asked and what was answered, as the conversation reads (previews and search). */
  input: string | null
  output: string | null
  truncated: boolean
  /** In tree order: a parent comes before its children. */
  spans: SpanDraft[]
}

/** Where a workflow run came from when its execution log alone cannot say (a developer API key). */
export interface RunOriginHint {
  source: 'api_key'
  apiKeyId: string
}

export const PRIVATE_SOURCES: readonly TraceSource[] = ['assistant', 'playground', 'copilot', 'wand']
