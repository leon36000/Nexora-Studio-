import { isRecordLike } from '@sim/utils/object'
import { gatewayErrors } from '@/lib/nexora/developer-api/errors'

/** Tokens a published agent's run used, summed over its model calls. */
export interface AgentRunUsage {
  promptTokens: number
  completionTokens: number
}

/** The part of an execution result its usage is read from: the block logs. */
interface RunLogs {
  logs?: readonly { output?: unknown }[]
}

function tokensOf(output: unknown): AgentRunUsage {
  if (!isRecordLike(output) || !isRecordLike(output.tokens)) {
    return { promptTokens: 0, completionTokens: 0 }
  }
  const { tokens } = output
  const read = (...values: unknown[]) => {
    const value = values.find((entry) => typeof entry === 'number' && Number.isFinite(entry))
    return typeof value === 'number' ? Math.max(0, Math.round(value)) : 0
  }
  return {
    promptTokens: read(tokens.input, tokens.prompt),
    completionTokens: read(tokens.output, tokens.completion),
  }
}

/** Tokens of every model call of a run, read from its block logs. */
function runUsage(result: RunLogs | null): AgentRunUsage {
  const usage = { promptTokens: 0, completionTokens: 0 }
  for (const log of result?.logs ?? []) {
    const used = tokensOf(log.output)
    usage.promptTokens += used.promptTokens
    usage.completionTokens += used.completionTokens
  }
  return usage
}

/**
 * Reads a run's usage once the run has settled, and records it once. A stream the caller cancels
 * mid-run asks before the run ends: it waits for the aborted run, whose logs hold the tokens
 * already spent, rather than recording nothing.
 */
export function settledRunUsage(
  run: Promise<RunLogs | null>,
  record: (usage: AgentRunUsage) => Promise<void>
): () => Promise<AgentRunUsage> {
  let settled: Promise<AgentRunUsage> | null = null
  return () => {
    settled ??= run
      .catch(() => null)
      .then(async (result) => {
        const usage = runUsage(result)
        await record(usage)
        return usage
      })
    return settled
  }
}

const HISTORY_HEADING = 'Échanges précédents :'
const MESSAGE_HEADING = 'Message :'
const ROLE_LABELS: Record<string, string> = { user: 'Utilisateur', assistant: 'Assistant' }
/** The caller's own instructions: a published agent keeps its own. */
const IGNORED_ROLES = new Set(['system', 'developer'])

function textOf(content: unknown): string {
  if (content === null || content === undefined) return ''
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) {
    throw gatewayErrors.invalidRequest('Le contenu d’un message doit être un texte.')
  }
  const parts: string[] = []
  for (const part of content) {
    if (isRecordLike(part) && part.type === 'text' && typeof part.text === 'string') {
      parts.push(part.text)
      continue
    }
    throw gatewayErrors.invalidRequest(
      'Les agents reçoivent du texte par l’API : les images, sons et fichiers ne sont pas pris en charge.',
      'unsupported_content'
    )
  }
  return parts.join('\n')
}

/**
 * The input of a published agent from OpenAI `messages`: the last user message, preceded by the
 * earlier user and assistant turns (OpenAI clients are stateless and resend the whole exchange).
 * The caller's system messages are left out: a published agent keeps its own instructions.
 */
export function buildAgentInput(messages: readonly unknown[]): string {
  const turns: { role: string; text: string }[] = []
  for (const message of messages) {
    if (!isRecordLike(message) || typeof message.role !== 'string') {
      throw gatewayErrors.invalidRequest('Chaque message doit avoir un rôle (« role »).')
    }
    if (IGNORED_ROLES.has(message.role)) continue
    if (!(message.role in ROLE_LABELS)) {
      throw gatewayErrors.invalidRequest(
        `Rôle « ${message.role} » non pris en charge par un agent : envoyez des messages « user » et « assistant ».`
      )
    }
    turns.push({ role: message.role, text: textOf(message.content) })
  }
  let lastUser = -1
  for (let index = turns.length - 1; index >= 0; index--) {
    if (turns[index].role === 'user') {
      lastUser = index
      break
    }
  }
  if (lastUser === -1) {
    throw gatewayErrors.invalidRequest(
      'Envoyez au moins un message de l’utilisateur (« role »: « user »).'
    )
  }
  const message = turns[lastUser].text.trim()
  if (!message) throw gatewayErrors.invalidRequest('Le dernier message de l’utilisateur est vide.')
  const history = turns
    .slice(0, lastUser)
    .filter((turn) => turn.text.trim())
    .map((turn) => `${ROLE_LABELS[turn.role]} : ${turn.text.trim()}`)
  if (history.length === 0) return message
  return `${HISTORY_HEADING}\n${history.join('\n')}\n\n${MESSAGE_HEADING}\n${message}`
}

type SimFrame =
  | { kind: 'chunk'; text: string }
  | { kind: 'final'; content: string | null }
  | { kind: 'error'; message: string }
  | { kind: 'comment'; text: string }
  | { kind: 'done' }

function finalContent(data: unknown): string | null {
  if (!isRecordLike(data) || !isRecordLike(data.output)) return null
  const { output } = data
  if (typeof output.content === 'string') return output.content
  for (const value of Object.values(output)) {
    if (isRecordLike(value) && typeof value.content === 'string') return value.content
  }
  return null
}

function parseFrame(event: string): SimFrame | null {
  if (event.startsWith(':')) return { kind: 'comment', text: event }
  const data = event
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .join('\n')
  if (!data) return null
  if (data === '[DONE]' || data === '"[DONE]"') return { kind: 'done' }
  let parsed: unknown
  try {
    parsed = JSON.parse(data)
  } catch {
    return null
  }
  if (!isRecordLike(parsed)) return null
  if (parsed.event === 'error') {
    return {
      kind: 'error',
      message: typeof parsed.error === 'string' ? parsed.error : 'Erreur de l’agent',
    }
  }
  if (parsed.event === 'final') return { kind: 'final', content: finalContent(parsed.data) }
  if (parsed.event === undefined && typeof parsed.chunk === 'string') {
    return { kind: 'chunk', text: parsed.chunk }
  }
  return null
}

/** Reads a deployed-workflow SSE stream (see `lib/workflows/streaming/streaming.ts`) frame by frame. */
async function* simFrames(stream: ReadableStream<Uint8Array>): AsyncGenerator<SimFrame> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let pending = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      pending += done ? decoder.decode() : decoder.decode(value, { stream: true })
      const events = pending.split('\n\n')
      pending = done ? '' : (events.pop() ?? '')
      for (const event of events) {
        const frame = parseFrame(event.trim())
        if (frame) yield frame
      }
      if (done) return
    }
  } finally {
    reader.releaseLock()
  }
}

const encoder = new TextEncoder()

function sseData(data: unknown): Uint8Array {
  return encoder.encode(`data: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`)
}

/**
 * A deployed agent's answer stream as OpenAI `chat.completion.chunk` events: answer text as
 * deltas, then a `stop` chunk, a usage chunk (choices empty, as with `stream_options.include_usage`)
 * and `[DONE]`. A failed run ends with `{ error }`, which the official clients raise.
 */
export function toOpenAiChunks(
  sim: ReadableStream<Uint8Array>,
  meta: { id: string; model: string; created: number },
  usage: () => Promise<AgentRunUsage>
): ReadableStream<Uint8Array> {
  const frames = simFrames(sim)
  let roleSent = false
  let streamedText = false
  let finished = false
  let usageRead = false
  /** The run's usage is read once: on its final frame, or when the stream ends without one. */
  const readUsage = () => {
    usageRead = true
    return usage()
  }
  const chunk = (delta: Record<string, unknown>, finishReason: string | null) => ({
    id: meta.id,
    object: 'chat.completion.chunk',
    created: meta.created,
    model: meta.model,
    choices: [{ index: 0, delta, finish_reason: finishReason }],
  })
  const contentChunk = (text: string) => {
    const delta = roleSent ? { content: text } : { role: 'assistant', content: text }
    roleSent = true
    return chunk(delta, null)
  }

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (finished) return
      const next = await frames.next()
      if (next.done) {
        finished = true
        if (!usageRead) await readUsage()
        controller.close()
        return
      }
      const frame = next.value
      switch (frame.kind) {
        case 'comment':
          controller.enqueue(encoder.encode(`${frame.text}\n\n`))
          return
        case 'chunk':
          if (!frame.text) return
          streamedText = true
          controller.enqueue(sseData(contentChunk(frame.text)))
          return
        case 'final':
          if (!streamedText && frame.content) {
            controller.enqueue(sseData(contentChunk(frame.content)))
          }
          controller.enqueue(sseData(chunk({}, 'stop')))
          {
            const used = await readUsage()
            controller.enqueue(
              sseData({
                id: meta.id,
                object: 'chat.completion.chunk',
                created: meta.created,
                model: meta.model,
                choices: [],
                usage: {
                  prompt_tokens: used.promptTokens,
                  completion_tokens: used.completionTokens,
                  total_tokens: used.promptTokens + used.completionTokens,
                },
              })
            )
          }
          return
        case 'error':
          controller.enqueue(
            sseData({
              error: {
                message: frame.message,
                type: 'api_error',
                code: 'agent_failed',
                param: null,
              },
            })
          )
          return
        case 'done':
          if (!usageRead) await readUsage()
          controller.enqueue(sseData('[DONE]'))
          finished = true
          controller.close()
          return
      }
    },
    async cancel(reason) {
      finished = true
      if (!usageRead) void readUsage()
      await frames.return(undefined)
      await sim.cancel(reason).catch(() => {})
    },
  })
}

/** The whole answer of a deployed agent's stream, for a non-streaming call. */
export async function collectAgentAnswer(
  sim: ReadableStream<Uint8Array>
): Promise<{ content: string; error: string | null }> {
  let content = ''
  let streamed = false
  let error: string | null = null
  for await (const frame of simFrames(sim)) {
    if (frame.kind === 'chunk') {
      streamed = true
      content += frame.text
    } else if (frame.kind === 'final' && !streamed && frame.content) {
      content = frame.content
    } else if (frame.kind === 'error') {
      error = frame.message
    }
  }
  return { content, error }
}
