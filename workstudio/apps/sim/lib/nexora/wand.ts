import { getErrorMessage } from '@sim/utils/errors'
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
 * Nexora edition: "Generate with AI" runs on the deployment's own model through Nexora API
 * (OpenAI-compatible Chat Completions) instead of OpenAI or Azure.
 */
export function isNexoraWandAvailable(): boolean {
  return isNexoraOnlyModels && Boolean(env.VLLM_BASE_URL)
}

async function requestCompletion(
  messages: WandMessage[],
  stream: boolean,
  signal?: AbortSignal
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
        model: NEXORA_DEFAULT_MODEL_ALIAS,
        messages,
        temperature: 0.2,
        max_tokens: 4000,
        stream,
        ...(stream ? { stream_options: { include_usage: true } } : {}),
      }),
      signal,
    })
  } catch (error) {
    throw new NexoraWandUnavailableError(getErrorMessage(error, 'request failed'))
  }
  if (!response.ok) {
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
}): Promise<{ text: string; usage: WandUsage }> {
  const response = await requestCompletion(input.messages, false, input.signal)
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
 * delta, then `data: {"done": true}` — so the editor reads it like the upstream stream.
 */
export async function nexoraWandStream(input: {
  messages: WandMessage[]
  signal?: AbortSignal
  onUsage?: (usage: WandUsage) => void | Promise<void>
}): Promise<ReadableStream<Uint8Array>> {
  const response = await requestCompletion(input.messages, true, input.signal)
  const source = response.body
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const emit = (controller: ReadableStreamDefaultController<Uint8Array>, payload: object) =>
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      if (!source) {
        emit(controller, { done: true })
        controller.close()
        return
      }
      const reader = source.getReader()
      let buffer = ''
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
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
            if (usage) await input.onUsage?.(usage)
          }
        }
        emit(controller, { done: true })
      } catch {
        emit(controller, { error: 'Streaming failed', done: true })
      } finally {
        reader.releaseLock()
        controller.close()
      }
    },
  })
}
