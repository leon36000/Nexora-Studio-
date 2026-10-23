import { availableParallelism } from 'node:os'
import { getErrorMessage } from '@sim/utils/errors'
import { env } from '@/lib/core/config/env'
import { type NexoraModelUsage, OLLAMA_MODEL_NAME } from '@/lib/nexora/model-ids'

/**
 * Local models recommended for French-speaking SMEs on the bundled Ollama: usage (chat, or vision
 * for reading images and scanned documents), disk size of the download, memory to run it
 * comfortably on a CPU server, and size in billions of parameters (for the carbon footprint
 * Nexora API computes).
 */
export const OLLAMA_CATALOG = [
  { name: 'qwen2.5:3b', usage: 'chat', diskGb: 1.9, memoryGb: 4, paramsB: 3 },
  { name: 'qwen2.5:7b', usage: 'chat', diskGb: 4.7, memoryGb: 8, paramsB: 7 },
  { name: 'qwen2.5:14b', usage: 'chat', diskGb: 9, memoryGb: 16, paramsB: 14 },
  { name: 'mistral:7b', usage: 'chat', diskGb: 4.1, memoryGb: 8, paramsB: 7 },
  { name: 'mistral-nemo:12b', usage: 'chat', diskGb: 7.1, memoryGb: 12, paramsB: 12 },
  { name: 'llama3.1:8b', usage: 'chat', diskGb: 4.9, memoryGb: 8, paramsB: 8 },
  { name: 'gemma2:9b', usage: 'chat', diskGb: 5.4, memoryGb: 10, paramsB: 9 },
  { name: 'qwen2.5vl:3b', usage: 'vision', diskGb: 3.2, memoryGb: 6, paramsB: 3.8 },
  { name: 'qwen2.5vl:7b', usage: 'vision', diskGb: 6, memoryGb: 10, paramsB: 8.3 },
] as const satisfies readonly {
  name: string
  usage: NexoraModelUsage
  diskGb: number
  memoryGb: number
  paramsB: number
}[]

/** Local files the knowledge bases need (`bge-m3`, or `bge-m3:latest`). */
const PROTECTED_MODELS = new Set(['bge-m3'])

export class OllamaUnavailableError extends Error {
  constructor(detail: string) {
    super(`The bundled Ollama is unavailable: ${detail}`)
    this.name = 'OllamaUnavailableError'
  }
}

interface OllamaOptions {
  baseUrl?: string
  fetchFn?: typeof fetch
  /** CPU cores of the server; the model gets half of them, like the installer does. */
  cores?: number
}

function resolve(options: OllamaOptions) {
  const baseUrl = (options.baseUrl ?? env.OLLAMA_URL ?? '').trim().replace(/\/+$/, '')
  if (!baseUrl) throw new OllamaUnavailableError('OLLAMA_URL is not set')
  return { baseUrl, fetchFn: options.fetchFn ?? fetch }
}

function assertModelName(name: string): void {
  if (!OLLAMA_MODEL_NAME.test(name)) throw new Error(`Invalid Ollama model name: ${name}`)
}

async function request(options: OllamaOptions, path: string, init: RequestInit): Promise<Response> {
  const { baseUrl, fetchFn } = resolve(options)
  try {
    // boundary-raw-fetch: the bundled Ollama is a separate service on the internal network
    return await fetchFn(`${baseUrl}${path}`, init)
  } catch (error) {
    throw new OllamaUnavailableError(getErrorMessage(error, 'request failed'))
  }
}

/** Names of the models already downloaded into the bundled Ollama. */
export async function listLocalModels(options: OllamaOptions = {}): Promise<string[]> {
  const response = await request(options, '/api/tags', { signal: AbortSignal.timeout(10_000) })
  if (!response.ok) throw new OllamaUnavailableError(`HTTP ${response.status}`)
  const body = (await response.json()) as { models?: { name?: string }[] }
  return (body.models ?? []).flatMap((model) => (model.name ? [model.name] : []))
}

/**
 * Downloads a model into the bundled Ollama and relays its progress as `data: {...}` events
 * (`status`, `total`, `completed`), then limits the model to half the server's cores (llama.cpp
 * collapses when other programs take its cores) and ends with `data: {"done": true}`. An error
 * from Ollama ends the stream with `data: {"error": ..., "done": true}`.
 */
export async function pullLocalModel(
  name: string,
  options: OllamaOptions & { signal?: AbortSignal } = {}
): Promise<ReadableStream<Uint8Array>> {
  assertModelName(name)
  const response = await request(options, '/api/pull', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: name, stream: true }),
    signal: options.signal,
  })
  if (!response.ok || !response.body) {
    await response.text().catch(() => '')
    throw new OllamaUnavailableError(`download answered HTTP ${response.status}`)
  }
  const source = response.body
  const threads = Math.max(1, Math.floor((options.cores ?? availableParallelism()) / 2))
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (payload: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      const reader = source.getReader()
      let buffer = ''
      let failed = false
      try {
        while (!failed) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.trim()) continue
            let event: { status?: string; total?: number; completed?: number; error?: string }
            try {
              event = JSON.parse(line)
            } catch {
              continue
            }
            if (event.error) {
              emit({ error: event.error, done: true })
              failed = true
              break
            }
            emit(event)
          }
        }
        if (!failed) {
          const tuned = await request(options, '/api/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: name,
              from: name,
              parameters: { num_thread: threads },
              stream: false,
            }),
            signal: options.signal,
          })
          await tuned.text().catch(() => '')
          emit({ done: true })
        }
      } catch (error) {
        emit({ error: getErrorMessage(error, 'download interrupted'), done: true })
      } finally {
        reader.releaseLock()
        controller.close()
      }
    },
    cancel() {
      return source.cancel()
    },
  })
}

/** Deletes a downloaded model's files. The knowledge bases' embedding model is never deleted. */
export async function deleteLocalModel(name: string, options: OllamaOptions = {}): Promise<void> {
  assertModelName(name)
  const embeddingModel = env.KB_EMBEDDING_MODEL?.replace(/^ollama\//, '')
  const base = name.toLowerCase().replace(/:latest$/, '')
  if (
    PROTECTED_MODELS.has(base) ||
    base === embeddingModel?.toLowerCase().replace(/:latest$/, '')
  ) {
    throw new Error(`${name} is used by the knowledge bases and is kept`)
  }
  const response = await request(options, '/api/delete', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: name }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok && response.status !== 404) {
    throw new OllamaUnavailableError(`delete answered HTTP ${response.status}`)
  }
}
