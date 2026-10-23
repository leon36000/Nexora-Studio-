import { toStringOrNull } from '@sim/utils/coerce'
import { getErrorMessage } from '@sim/utils/errors'
import { toRecord } from '@sim/utils/object'
import { escapeRegExp, truncate } from '@sim/utils/string'
import { env } from '@/lib/core/config/env'
import { isNexoraOnlyModels } from '@/lib/core/config/env-flags'

/** Model alias Nexora API resolves to the deployment's default chat model. */
const NEXORA_DEFAULT_MODEL_ALIAS = 'nexora-default'

export interface WandMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface WandUsage {
  promptTokens: number
  completionTokens: number
}

/** Nexora API could not be reached or did not answer: the model is unavailable for now. */
export class NexoraWandUnavailableError extends Error {
  constructor(detail: string) {
    super(`Nexora API is unavailable for generation: ${detail}`)
    this.name = 'NexoraWandUnavailableError'
  }
}

/**
 * The model refused the request itself (unknown model, prompt longer than its context, too many
 * tokens asked…): retrying the same request will not help. `reason` is the short upstream reason,
 * without the key.
 */
export class NexoraWandRejectedError extends Error {
  constructor(readonly reason: string) {
    super(`The model refused the request: ${reason}`)
    this.name = 'NexoraWandRejectedError'
  }
}

/**
 * How a surface answers a failed generation: 422 with the model's reason when it refused the
 * request, 503 when it could not be reached; `null` for any other error.
 */
export function describeWandFailure(
  error: unknown
): { status: 422; code: 'rejected'; reason: string } | { status: 503; code: 'unavailable' } | null {
  if (error instanceof NexoraWandRejectedError) {
    return { status: 422, code: 'rejected', reason: error.reason }
  }
  if (error instanceof NexoraWandUnavailableError) return { status: 503, code: 'unavailable' }
  return null
}

/** Upstream statuses that say nothing about the request itself: the service is what failed. */
const SERVICE_FAILURE_STATUSES = new Set([401, 403, 408, 429])
const MAX_REASON_LENGTH = 200

/** The upstream error's own message (OpenAI `error.message`, FastAPI `detail`), short and keyless. */
async function rejectionReason(response: Response): Promise<string> {
  const text = await response.text().catch(() => '')
  let body: unknown = null
  try {
    body = JSON.parse(text)
  } catch {
    body = null
  }
  const record = toRecord(body)
  const message =
    toStringOrNull(toRecord(record.error).message) ??
    toStringOrNull(record.error) ??
    toStringOrNull(record.detail) ??
    toStringOrNull(record.message) ??
    `HTTP ${response.status}`
  const key = env.VLLM_API_KEY
  const keyless = (key ? message.replace(new RegExp(escapeRegExp(key), 'g'), '***') : message)
    .replace(/Bearer\s+\S+/gi, 'Bearer ***')
    .replace(/\s+/g, ' ')
    .trim()
  return truncate(keyless, MAX_REASON_LENGTH)
}

/**
 * Nexora edition: "Generate with AI" runs on the deployment's own model through Nexora API
 * (OpenAI-compatible Chat Completions) instead of OpenAI or Azure.
 */
export function isNexoraWandAvailable(): boolean {
  return isNexoraOnlyModels && Boolean(env.VLLM_BASE_URL)
}

/** The model and sampling settings of one request (the Playground chooses them; the wand does not). */
interface CompletionSettings {
  model?: string
  temperature?: number
  maxTokens?: number
  /** `json_object` asks the model for one JSON object (OpenAI JSON mode); text otherwise. */
  responseFormat?: 'json_object'
}

async function requestCompletion(
  messages: WandMessage[],
  stream: boolean,
  signal?: AbortSignal,
  settings: CompletionSettings = {}
): Promise<Response> {
  const baseUrl = (env.VLLM_BASE_URL ?? '').replace(/\/+$/, '')
  let response: Response
  try {
    // boundary-raw-fetch: Nexora API is a separate OpenAI-compatible service, not a same-origin route
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.VLLM_API_KEY ? { Authorization: `Bearer ${env.VLLM_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        model: settings.model ?? NEXORA_DEFAULT_MODEL_ALIAS,
        messages,
        temperature: settings.temperature ?? 0.2,
        max_tokens: settings.maxTokens ?? 4000,
        stream,
        ...(stream ? { stream_options: { include_usage: true } } : {}),
        ...(settings.responseFormat ? { response_format: { type: settings.responseFormat } } : {}),
      }),
      signal,
    })
  } catch (error) {
    throw new NexoraWandUnavailableError(getErrorMessage(error, 'request failed'))
  }
  if (!response.ok) {
    if (response.status < 500 && !SERVICE_FAILURE_STATUSES.has(response.status)) {
      throw new NexoraWandRejectedError(await rejectionReason(response))
    }
    throw new NexoraWandUnavailableError(`HTTP ${response.status}`)
  }
  return response
}

function toUsage(raw: unknown): WandUsage | null {
  const usage = raw as { prompt_tokens?: number; completion_tokens?: number } | null | undefined
  if (!usage || typeof usage.prompt_tokens !== 'number') return null
  return { promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens ?? 0 }
}

/** One generation, whole: the trimmed text and its token usage. */
export async function nexoraWandComplete(input: {
  messages: WandMessage[]
  signal?: AbortSignal
  responseFormat?: CompletionSettings['responseFormat']
}): Promise<{ text: string; usage: WandUsage }> {
  const response = await requestCompletion(input.messages, false, input.signal, {
    responseFormat: input.responseFormat,
  })
  const body = (await response.json()) as {
    choices?: { message?: { content?: string } }[]
    usage?: unknown
  }
  return {
    text: (body.choices?.[0]?.message?.content ?? '').trim(),
    usage: toUsage(body.usage) ?? { promptTokens: 0, completionTokens: 0 },
  }
}

/**
 * One generation as a stream in the wand's own event format — `data: {"chunk": …}` per
 * delta, then `data: {"done": true}` — so the editor reads it like the upstream stream. The
 * Playground also picks the model and settings and asks for the usage in the final event.
 */
export async function nexoraWandStream(
  input: {
    messages: WandMessage[]
    signal?: AbortSignal
    onUsage?: (usage: WandUsage) => void | Promise<void>
    reportUsage?: boolean
  } & CompletionSettings
): Promise<ReadableStream<Uint8Array>> {
  const response = await requestCompletion(input.messages, true, input.signal, input)
  const source = response.body
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  let emitted = 0
  const emit = (controller: ReadableStreamDefaultController<Uint8Array>, payload: object) => {
    emitted += 1
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
  }

  if (!source) {
    return new ReadableStream<Uint8Array>({
      start(controller) {
        emit(controller, { done: true })
        controller.close()
      },
    })
  }

  const reader = source.getReader()
  let buffer = ''
  let lastUsage: WandUsage | null = null
  let cancelled = false

  /** Relays one upstream read; `false` once the answer is over. */
  const relay = async (controller: ReadableStreamDefaultController<Uint8Array>) => {
    const { done, value } = await reader.read()
    if (cancelled) return false
    if (done) {
      emit(controller, {
        done: true,
        ...(input.reportUsage && lastUsage ? { usage: lastUsage } : {}),
      })
      return false
    }
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const data = line.trim().startsWith('data:') ? line.trim().slice(5).trim() : ''
      if (!data || data === '[DONE]') continue
      let parsed: { choices?: { delta?: { content?: string } }[]; usage?: unknown }
      try {
        parsed = JSON.parse(data)
      } catch {
        continue
      }
      const content = parsed.choices?.[0]?.delta?.content
      if (content) emit(controller, { chunk: content })
      const usage = toUsage(parsed.usage)
      if (usage) {
        lastUsage = usage
        await input.onUsage?.(usage)
      }
    }
    return true
  }

  return new ReadableStream<Uint8Array>({
    // Reads upstream until this pull relays something: a pull that enqueues nothing is not repeated.
    async pull(controller) {
      const before = emitted
      let more = true
      try {
        while (more && emitted === before) more = await relay(controller)
      } catch {
        if (cancelled) return
        emit(controller, { error: 'Streaming failed', done: true })
        more = false
      }
      if (!more && !cancelled) controller.close()
    },
    async cancel(reason) {
      cancelled = true
      await reader.cancel(reason).catch(() => undefined)
    },
  })
}
