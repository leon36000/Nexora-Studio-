import { getErrorMessage } from '@sim/utils/errors'
import { toRecord } from '@sim/utils/object'
import { env } from '@/lib/core/config/env'
import { nexoraLongFetch } from '@/lib/nexora/long-fetch.server'
import { modelNamesOfUsage, type NexoraModelUsage } from '@/lib/nexora/model-ids'

type NexoraDocumentAiErrorCode =
  | 'not-configured'
  | 'no-model'
  | 'unknown-model'
  | 'refused'
  | 'unavailable'
  | 'too-many-pages'
  | 'too-long'

const STATUS_BY_CODE: Record<NexoraDocumentAiErrorCode, number> = {
  'not-configured': 503,
  'no-model': 400,
  'unknown-model': 400,
  refused: 400,
  unavailable: 502,
  'too-many-pages': 413,
  'too-long': 413,
}

/** A Nexora vision, OCR or transcription request that cannot be served, with a code callers map. */
export class NexoraDocumentAiError extends Error {
  readonly status: number

  constructor(
    readonly code: NexoraDocumentAiErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'NexoraDocumentAiError'
    this.status = STATUS_BY_CODE[code]
  }
}

interface NexoraApiConfig {
  /** Nexora API's OpenAI-compatible base, with `/v1`. */
  baseUrl: string
  apiKey: string
}

export interface NexoraApiOptions {
  config?: NexoraApiConfig
  fetchFn?: typeof fetch
  signal?: AbortSignal
}

/** A CPU vision or transcription model takes minutes; Nexora API itself waits up to 600 s. */
const REQUEST_TIMEOUT_MS = 15 * 60 * 1000

function resolve(options: NexoraApiOptions) {
  const config = options.config ?? {
    baseUrl: (env.VLLM_BASE_URL ?? '').trim().replace(/\/+$/, ''),
    apiKey: env.VLLM_API_KEY?.trim() ?? '',
  }
  if (!config.baseUrl) {
    throw new NexoraDocumentAiError(
      'not-configured',
      'Nexora API is not configured (VLLM_BASE_URL)'
    )
  }
  return { config, fetchFn: options.fetchFn ?? nexoraLongFetch }
}

/** Calls Nexora API with WorkStudio's key, like a block calling a chat model. */
export async function callNexoraApi(
  path: string,
  init: { body: string | FormData; json?: boolean },
  options: NexoraApiOptions = {}
): Promise<{ status: number; data: Record<string, unknown> }> {
  const { config, fetchFn } = resolve(options)
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  let response: Response
  try {
    // boundary-raw-fetch: Nexora API is a separate service, not a same-origin route
    response = await fetchFn(`${config.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        ...(init.json ? { 'Content-Type': 'application/json' } : {}),
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: init.body,
      signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
    })
  } catch (error) {
    options.signal?.throwIfAborted()
    throw new NexoraDocumentAiError(
      'unavailable',
      `Nexora API did not answer: ${getErrorMessage(error, 'request failed')}`
    )
  }
  const data = toRecord(await response.json().catch(() => ({})))
  return { status: response.status, data }
}

/** Nexora API's own explanation of a refusal (`detail`, a string or FastAPI's list of errors). */
export function refusalDetail(data: Record<string, unknown>, status: number): string {
  const detail = data.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const messages = detail.map((item) => toRecord(item).msg).filter((m) => typeof m === 'string')
    if (messages.length > 0) return messages.join('; ')
  }
  return `HTTP ${status}`
}

/**
 * Statuses that say nothing about the file: WorkStudio's key rejected (until the bootstrap renews
 * it), a request timeout, a rate limit. The request is worth retrying later.
 */
const UNAVAILABLE_STATUSES: ReadonlySet<number> = new Set([401, 403, 408, 429])

/** Raises the refusal of a Nexora API answer, worded for the execution log. */
export function assertAnswered(status: number, data: Record<string, unknown>, what: string): void {
  if (status < 400) return
  const detail = refusalDetail(data, status)
  if (status === 404) {
    /** Nexora API answers 404 for a model that is gone or has no provider behind it. */
    throw new NexoraDocumentAiError('no-model', `${what}: the model is not served (${detail})`)
  }
  throw new NexoraDocumentAiError(
    status >= 500 || UNAVAILABLE_STATUSES.has(status) ? 'unavailable' : 'refused',
    `${what} failed: ${detail}`
  )
}

/**
 * The Nexora model a block uses for a usage: the one it names (with or without the `vllm/`
 * prefix of the chat blocks), else the first model of that usage in Réglages › Modèles.
 */
export async function resolveUsageModel(
  usage: NexoraModelUsage,
  requested: string | null | undefined,
  options: NexoraApiOptions = {}
): Promise<string> {
  const { config, fetchFn } = resolve(options)
  let response: Response
  try {
    // boundary-raw-fetch: Nexora API is a separate service, not a same-origin route
    response = await fetchFn(`${config.baseUrl}/models`, {
      headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {},
      signal: options.signal ?? AbortSignal.timeout(15_000),
    })
  } catch (error) {
    options.signal?.throwIfAborted()
    throw new NexoraDocumentAiError(
      'unavailable',
      `Nexora API did not answer: ${getErrorMessage(error, 'request failed')}`
    )
  }
  if (!response.ok) {
    throw new NexoraDocumentAiError('unavailable', `Nexora API model list: HTTP ${response.status}`)
  }
  const listed = toRecord(await response.json().catch(() => ({}))).data
  const models = Array.isArray(listed)
    ? listed.flatMap((item) => {
        const model = toRecord(item)
        return typeof model.id === 'string' ? [{ ...model, id: model.id }] : []
      })
    : []
  const names = modelNamesOfUsage(models, usage)
  const wanted = requested?.trim().replace(/^vllm\//, '')
  if (wanted) {
    if (names.includes(wanted)) return wanted
    throw new NexoraDocumentAiError(
      'unknown-model',
      `${wanted} is not a ${usage} model of this instance (Réglages › Modèles lists them)`
    )
  }
  const first = names[0]
  if (!first) {
    throw new NexoraDocumentAiError(
      'no-model',
      `No ${usage} model is set up: an administrator adds one in Réglages › Modèles`
    )
  }
  return first
}

export interface NexoraTranscribeInput {
  audio: Buffer
  fileName: string
  mimeType: string
  model: string
  /** ISO-639-1 code, or `auto` to let the model detect it. */
  language?: string
  prompt?: string
}

/** One `/audio/transcriptions` request: the audio as a form, the transcript text back. */
export async function nexoraTranscribe(
  input: NexoraTranscribeInput,
  options: NexoraApiOptions = {}
): Promise<string> {
  const form = new FormData()
  form.append(
    'file',
    new Blob([new Uint8Array(input.audio)], { type: input.mimeType || 'audio/mpeg' }),
    input.fileName || 'audio.mp3'
  )
  form.append('model', input.model)
  if (input.language && input.language !== 'auto') form.append('language', input.language)
  if (input.prompt) form.append('prompt', input.prompt)
  form.append('response_format', 'json')
  const { status, data } = await callNexoraApi('/audio/transcriptions', { body: form }, options)
  assertAnswered(status, data, 'Transcription')
  return typeof data.text === 'string' ? data.text.trim() : ''
}
