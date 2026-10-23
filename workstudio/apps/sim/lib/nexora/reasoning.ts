import { toRecord } from '@sim/utils/object'

/**
 * Nexora edition: reads a reasoning model's thinking apart from its answer, whatever shape the
 * service gives it — a `reasoning_content` field (DeepSeek, GLM through LiteLLM), a `reasoning`
 * field (vLLM, Ollama, OpenRouter, as a string or `{ text }`), or `<think>…</think>` written at the
 * start of the answer itself (qwen3 and deepseek-r1 on Ollama). Thinking never belongs in an
 * answer: callers keep it apart, show it folded, or drop it.
 */

/** The efforts a person can ask for; « default » sends nothing. */
export const REASONING_EFFORTS = ['low', 'medium', 'high'] as const
export type ReasoningEffort = (typeof REASONING_EFFORTS)[number]

/**
 * Models whose provider forwards `reasoning_effort` whatever the catalog says, and drops it when
 * the model refuses it: every model Nexora API serves (`vllm/<name>`).
 */
export const REASONING_EFFORT_PASS_THROUGH_PREFIXES = ['vllm/'] as const

/** Whether `model` is served by a provider that forwards the reasoning effort as is. */
export function passesReasoningEffortThrough(model: string): boolean {
  const lowered = model.trim().toLowerCase()
  return REASONING_EFFORT_PASS_THROUGH_PREFIXES.some((prefix) => lowered.startsWith(prefix))
}

export interface ReasoningPiece {
  kind: 'reasoning' | 'content'
  text: string
}

const OPEN_TAG = '<think>'
const CLOSE_TAG = '</think>'

function reasoningField(value: unknown): string {
  if (typeof value === 'string') return value
  const text = toRecord(value).text
  return typeof text === 'string' ? text : ''
}

/** The reasoning carried beside the answer by a message or a stream delta. */
export function readDeltaReasoning(delta: unknown): string {
  const record = toRecord(delta)
  return reasoningField(record.reasoning_content) || reasoningField(record.reasoning)
}

/**
 * Splits `<think>…</think>` opening an answer (after optional whitespace) from what follows. An
 * unclosed block is all reasoning: the output stopped before the answer began. A tag anywhere
 * else is part of the answer.
 */
export function splitInlineThinking(text: string): { content: string; reasoning: string } {
  const start = text.length - text.trimStart().length
  if (!text.startsWith(OPEN_TAG, start)) return { content: text, reasoning: '' }
  const bodyStart = start + OPEN_TAG.length
  const end = text.indexOf(CLOSE_TAG, bodyStart)
  if (end === -1) return { content: '', reasoning: text.slice(bodyStart).trim() }
  return {
    reasoning: text.slice(bodyStart, end).trim(),
    content: text.slice(end + CLOSE_TAG.length).trimStart(),
  }
}

/** The answer and the reasoning of a whole (non-streamed) chat completion message. */
export function readMessageReasoning(message: unknown): { content: string; reasoning: string } {
  const record = toRecord(message)
  const raw = typeof record.content === 'string' ? record.content : ''
  const inline = splitInlineThinking(raw)
  const separate = readDeltaReasoning(record)
  return {
    content: inline.content,
    reasoning: [separate, inline.reasoning].filter(Boolean).join('\n\n'),
  }
}

/**
 * Splits a streamed answer into reasoning and answer pieces as it arrives, holding back only what
 * could still be the start of a tag, so a tag cut across chunks never shows.
 */
export function createThinkTagSplitter(): {
  push: (text: string) => ReasoningPiece[]
  flush: () => ReasoningPiece[]
} {
  let state: 'start' | 'reasoning' | 'content' = 'start'
  let pending = ''

  const piece = (kind: ReasoningPiece['kind'], text: string): ReasoningPiece[] =>
    text ? [{ kind, text }] : []

  function push(text: string): ReasoningPiece[] {
    if (state === 'content') return piece('content', text)
    pending += text
    if (state === 'start') {
      const trimmed = pending.trimStart()
      if (!trimmed) return []
      if (trimmed.startsWith(OPEN_TAG)) {
        state = 'reasoning'
        pending = trimmed.slice(OPEN_TAG.length)
      } else if (OPEN_TAG.startsWith(trimmed)) {
        return []
      } else {
        state = 'content'
        const out = pending
        pending = ''
        return piece('content', out)
      }
    }
    const end = pending.indexOf(CLOSE_TAG)
    if (end !== -1) {
      const reasoning = pending.slice(0, end)
      const rest = pending.slice(end + CLOSE_TAG.length).trimStart()
      state = 'content'
      pending = ''
      return [...piece('reasoning', reasoning), ...piece('content', rest)]
    }
    let keep = 0
    for (let size = Math.min(CLOSE_TAG.length - 1, pending.length); size > 0; size--) {
      if (CLOSE_TAG.startsWith(pending.slice(-size))) {
        keep = size
        break
      }
    }
    const out = pending.slice(0, pending.length - keep)
    pending = pending.slice(pending.length - keep)
    return piece('reasoning', out)
  }

  function flush(): ReasoningPiece[] {
    const out = pending
    pending = ''
    if (state === 'reasoning') return piece('reasoning', out)
    return piece('content', out)
  }

  return { push, flush }
}

/** The service refused the `reasoning_effort` setting itself (HTTP 400 naming it). */
export function isReasoningEffortRejection(status: number, message: string): boolean {
  return status === 400 && message.includes('reasoning_effort')
}
