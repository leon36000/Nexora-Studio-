import { isRecordLike, toRecord } from '@sim/utils/object'
import { generateRandomHex } from '@sim/utils/random'
import type { TraceSpan } from '@/lib/logs/types'
import { lastUserText, messagesToText, modelLabel, valueToText } from '@/lib/nexora/traces/text'
import type {
  RunOriginHint,
  SpanDraft,
  SpanKind,
  TraceDraft,
  TraceSource,
} from '@/lib/nexora/traces/types'

interface ExecutionInput {
  executionId: string
  workspaceId: string
  workflow: { id: string; name: string }
  traceSpans: TraceSpan[]
  /** The run's trigger (`chat`, `api`, `schedule`, `manual`…). */
  trigger: string
  /** Set when a signed-in member chatted with a members-only deployed chat (the Assistant). */
  memberChatUserId: string | null
  actorUserId: string | null
  status: 'ok' | 'error'
  durationMs: number
  startedAt: Date
  error: string | null
  workflowInput: unknown
  finalOutput: unknown
  tokens: { input: number; output: number } | null
  hint?: RunOriginHint
}

const KNOWLEDGE_TOOL = /^knowledge_/

function isRootWorkflowSpan(span: TraceSpan): boolean {
  return span.type === 'workflow' && !span.blockId
}

function spanKind(span: TraceSpan): SpanKind {
  if (span.type === 'model') return 'model'
  if (span.type === 'tool') return KNOWLEDGE_TOOL.test(span.name) ? 'knowledge' : 'tool'
  if (span.type === 'workflow' || span.type === 'workflow_input' || span.childWorkflowId) {
    return 'delegation'
  }
  return 'step'
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 0
}

function parseDate(value: unknown, fallback: Date): Date {
  const date = typeof value === 'string' ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? date : fallback
}

function outputText(output: unknown): string | null {
  const record = toRecord(output)
  return typeof record.content === 'string' ? record.content || null : valueToText(output)
}

interface WalkState {
  spans: SpanDraft[]
  /** The agent block's messages wait here for its first model span. */
  pendingMessages: string | null
}

function walk(span: TraceSpan, parentId: string | null, parentStart: Date, state: WalkState) {
  const kind = spanKind(span)
  const startedAt = parseDate(span.startTime, parentStart)
  const id = generateRandomHex(16)
  const model = kind === 'model' ? modelLabel(span.model ?? span.name) : null
  const attributes: Record<string, unknown> = {}
  if (kind === 'step' || kind === 'delegation') attributes.blockType = span.type
  if (span.finishReason) attributes.finishReason = span.finishReason
  if (span.provider) attributes.provider = span.provider
  if (typeof span.ttft === 'number') attributes.ttftMs = Math.round(span.ttft)
  if (span.toolCallId) attributes.toolCallId = span.toolCallId
  if (span.errorType) attributes.errorType = span.errorType
  if (span.errorMessage) attributes.error = span.errorMessage
  if (span.thinking) attributes.reasoning = span.thinking
  if (span.modelToolCalls?.length) {
    attributes.toolCalls = span.modelToolCalls.map((call) => call.name)
  }

  let input: string | null = null
  let output: string | null = null
  if (kind === 'model') {
    input = state.pendingMessages
    state.pendingMessages = null
    output = outputText(span.output)
  } else if (span.type === 'agent') {
    state.pendingMessages = messagesToText(toRecord(span.input).messages)
    output = outputText(span.output)
  } else {
    input = valueToText(span.input)
    output = outputText(span.output)
  }

  state.spans.push({
    id,
    parentId,
    kind,
    name: model ?? span.name,
    model,
    startedAt,
    durationMs: count(span.duration),
    status: span.status === 'error' && !span.errorHandled ? 'error' : 'ok',
    inputTokens: kind === 'model' ? count(span.tokens?.input) : 0,
    outputTokens: kind === 'model' ? count(span.tokens?.output) : 0,
    input,
    output,
    attributes,
  })
  for (const child of span.children ?? []) walk(child, id, startedAt, state)
}

function traceSource(input: ExecutionInput): TraceSource {
  if (input.memberChatUserId) return 'assistant'
  if (input.hint) return input.hint.source
  return input.trigger === 'chat' ? 'agent' : 'workflow'
}

function conversationInput(workflowInput: unknown): string | null {
  const record = isRecordLike(workflowInput) ? workflowInput : null
  if (record && typeof record.input === 'string') return record.input || null
  if (typeof workflowInput === 'string') return workflowInput || null
  return lastUserText(record?.messages) ?? valueToText(workflowInput)
}

/**
 * The trace of one workflow run (an agent, an Assistant turn, an API-called agent, a plain
 * workflow), from the spans its execution log recorded: the workflow is the root, each block a
 * step, and an agent block's model calls, tool calls and knowledge searches its children.
 */
export function draftFromExecution(input: ExecutionInput): TraceDraft {
  const rootId = generateRandomHex(16)
  const spans: SpanDraft[] = [
    {
      id: rootId,
      parentId: null,
      kind: 'step',
      name: input.workflow.name,
      model: null,
      startedAt: input.startedAt,
      durationMs: Math.max(0, Math.round(input.durationMs)),
      status: input.status,
      inputTokens: 0,
      outputTokens: 0,
      input: null,
      output: null,
      attributes: { blockType: 'workflow' },
    },
  ]
  const state: WalkState = { spans, pendingMessages: null }
  for (const top of input.traceSpans) {
    const blocks = isRootWorkflowSpan(top) ? (top.children ?? []) : [top]
    for (const block of blocks) walk(block, rootId, input.startedAt, state)
  }

  const modelSpans = spans.filter((span) => span.kind === 'model')
  const inputTokens =
    input.tokens?.input ?? modelSpans.reduce((sum, span) => sum + span.inputTokens, 0)
  const outputTokens =
    input.tokens?.output ?? modelSpans.reduce((sum, span) => sum + span.outputTokens, 0)
  const source = traceSource(input)
  const failure = spans.find((span) => span.status === 'error' && span.attributes.error)
  return {
    id: generateRandomHex(32),
    workspaceId: input.workspaceId,
    userId: input.memberChatUserId ?? input.actorUserId,
    source,
    visibility: input.memberChatUserId ? 'private' : 'workspace',
    name: input.workflow.name,
    agentId: input.workflow.id,
    agentName: input.workflow.name,
    apiKeyId: input.hint?.apiKeyId ?? null,
    executionId: input.executionId,
    status: input.status,
    error:
      input.error ??
      (typeof failure?.attributes.error === 'string' ? failure.attributes.error : null),
    startedAt: input.startedAt,
    durationMs: Math.max(0, Math.round(input.durationMs)),
    inputTokens,
    outputTokens,
    input: conversationInput(input.workflowInput),
    output: outputText(input.finalOutput),
    truncated: false,
    spans,
  }
}
