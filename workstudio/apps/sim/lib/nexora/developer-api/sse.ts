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

function tokenCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 0
}

function deltaText(chunk: Record<string, unknown>): string {
  if (!Array.isArray(chunk.choices)) return ''
  let text = ''
  for (const choice of chunk.choices) {
    if (!isRecordLike(choice) || !isRecordLike(choice.delta)) continue
    const { content, reasoning_content: reasoning } = choice.delta
    if (typeof content === 'string') text += content
    if (typeof reasoning === 'string') text += reasoning
  }
  return text
}

/**
 * Relays an OpenAI-format SSE stream byte for byte and reports, once, what it used: the final
 * `usage` chunk Nexora API appends, or an estimate when the stream ends without one (the caller
 * cancelled, the model failed). Reported on the normal end, on an upstream error and on a cancel.
 */
export function relayWithUsage(
  upstream: ReadableStream<Uint8Array>,
  onDone: (usage: RelayedUsage) => void
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
    streamedCharacters += deltaText(parsed).length
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
