import { generateRandomHex } from '@sim/utils/random'
import { lastUserText, messagesToText, modelLabel } from '@/lib/nexora/traces/text'
import {
  PRIVATE_SOURCES,
  type TraceDraft,
  type TraceSource,
} from '@/lib/nexora/traces/types'

interface CallInput {
  source: TraceSource
  workspaceId: string | null
  userId: string | null
  apiKeyId: string | null
  name: string
  model: string
  startedAt: Date
  durationMs: number
  /** The OpenAI-style `messages` the model got. */
  messages: unknown
  answer: string | null
  usage: { promptTokens: number; completionTokens: number } | null
  error: string | null
  reasoning?: string | null
  /** The person stopped the answer before its end. */
  interrupted?: boolean
}

/** The trace of one direct model call (Playground, Copilot, « Generate », a key-called model): one model span. */
export function draftFromCall(call: CallInput): TraceDraft {
  const failed = call.error !== null
  const inputTokens = call.usage?.promptTokens ?? 0
  const outputTokens = call.usage?.completionTokens ?? 0
  const model = modelLabel(call.model)
  return {
    id: generateRandomHex(32),
    workspaceId: call.workspaceId,
    userId: call.userId,
    source: call.source,
    visibility: PRIVATE_SOURCES.includes(call.source) ? 'private' : 'workspace',
    name: call.name,
    agentId: null,
    agentName: null,
    apiKeyId: call.apiKeyId,
    executionId: null,
    status: failed ? 'error' : 'ok',
    error: call.error,
    startedAt: call.startedAt,
    durationMs: call.durationMs,
    inputTokens,
    outputTokens,
    input: lastUserText(call.messages),
    output: call.answer,
    truncated: false,
    spans: [
      {
        id: generateRandomHex(16),
        parentId: null,
        kind: 'model',
        name: model,
        model,
        startedAt: call.startedAt,
        durationMs: call.durationMs,
        status: failed ? 'error' : 'ok',
        inputTokens,
        outputTokens,
        input: messagesToText(call.messages),
        output: call.answer,
        attributes: {
          ...(call.reasoning ? { reasoning: call.reasoning } : {}),
          ...(call.interrupted ? { interrupted: true } : {}),
        },
      },
    ],
  }
}
