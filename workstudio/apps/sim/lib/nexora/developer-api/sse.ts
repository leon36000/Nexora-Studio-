import { isRecordLike } from '@sim/utils/object'

/** What a relayed model stream used, read from its final `usage` chunk or estimated. */
export interface RelayedUsage {
  promptTokens: number
  completionTokens: number
  /** The model the chunks name (the router behind an alias), when one did. */
  model: string | null
  /** `true` when the stream ended without a usage chunk (cut short): completion ≈ characters / 4. */
  estimated: boolean
}

const CHARACTERS_PER_TOKEN = 4
/** How much of an answer (and of its reasoning) the optional capture keeps for a trace. */
const CAPTURE_LIMIT = 12_000

/** Text collected from a relayed stream, filled in as it streams. */
export interface RelayedText {
  answer: string
  reasoning: string
}

function tokenCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 0
}

function deltaParts(chunk: Record<string, unknown>): { answer: string; reasoning: string } {
  const parts = { answer: '', reasoning: '' }
  if (!Array.isArray(chunk.choices)) return parts
  for (const choice of chunk.choices) {
    if (!isRecordLike(choice) || !isRecordLike(choice.delta)) continue
    const { content, reasoning_content: reasoning } = choice.delta
    if (typeof content === 'string') parts.answer += content
    if (typeof reasoning === 'string') parts.reasoning += reasoning
  }
  return parts
}

/**
 * Relays an OpenAI-format SSE stream byte for byte and reports, once, what it used: the final
 * `usage` chunk Nexora API appends, or an estimate when the stream ends without one (the caller
 * cancelled, the model failed). Reported on the normal end, on an upstream error and on a cancel.
 * `capture`, when given, is filled with the streamed answer and reasoning (up to a limit) before
 * `onDone` runs.
 */
export function relayWithUsage(
  upstream: ReadableStream<Uint8Array>,
  onDone: (usage: RelayedUsage) => void,
  capture?: RelayedText
): ReadableStream<Uint8Array> {
  const reader = upstream.getReader()
  const decoder = new TextDecoder()
  let pending = ''
  let usage: { prompt: number; completion: number } | null = null
  let model: string | null = null
  let streamedCharacters = 0
  let reported = false

  const readLine = (line: string) => {
    if (!line.startsWith('data:')) return
    const payload = line.slice(5).trim()
    if (!payload.startsWith('{')) return
    let parsed: unknown
    try {
      parsed = JSON.parse(payload)
    } catch {
      return
    }
    if (!isRecordLike(parsed)) return
    if (typeof parsed.model === 'string' && parsed.model) model = parsed.model
    const parts = deltaParts(parsed)
    streamedCharacters += parts.answer.length + parts.reasoning.length
    if (capture) {
      if (capture.answer.length < CAPTURE_LIMIT) capture.answer += parts.answer
      if (capture.reasoning.length < CAPTURE_LIMIT) capture.reasoning += parts.reasoning
    }
    if (isRecordLike(parsed.usage)) {
      usage = {
        prompt: tokenCount(parsed.usage.prompt_tokens),
        completion: tokenCount(parsed.usage.completion_tokens),
      }
    }
  }

  const readText = (text: string) => {
    pending += text
    const lines = pending.split('\n')
    pending = lines.pop() ?? ''
    for (const line of lines) readLine(line.replace(/\r$/, ''))
  }

  const report = () => {
    if (reported) return
    reported = true
    if (pending) readLine(pending)
    const measured = usage
    onDone(
      measured
        ? {
            promptTokens: measured.prompt,
            completionTokens: measured.completion,
            model,
            estimated: false,
          }
        : {
            promptTokens: 0,
            completionTokens: Math.ceil(streamedCharacters / CHARACTERS_PER_TOKEN),
            model,
            estimated: true,
          }
    )
  }

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read()
        if (done) {
          readText(decoder.decode())
          report()
          controller.close()
          return
        }
        readText(decoder.decode(value, { stream: true }))
        controller.enqueue(value)
      } catch (error) {
        report()
        controller.error(error)
      }
    },
    async cancel(reason) {
      report()
      await reader.cancel(reason)
    },
  })
}
