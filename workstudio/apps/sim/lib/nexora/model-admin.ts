import { getErrorMessage } from '@sim/utils/errors'
import { env } from '@/lib/core/config/env'
import {
  DEFAULT_MODEL_ALIAS,
  type NexoraModelUsage,
  ROUTER_TYPE_BY_USAGE,
  usageOfRouterType,
} from '@/lib/nexora/model-ids'
import { readMessageReasoning } from '@/lib/nexora/reasoning'

/** Where a model runs: the bundled Ollama, Mistral AI, or any OpenAI-compatible service. */
export type NexoraModelSource = 'ollama' | 'mistral' | 'openai-compatible'

export interface NexoraModel {
  /** Nexora API router id. */
  id: number
  /** The name blocks use (`vllm/<name>`). */
  name: string
  isDefault: boolean
  /** Chat, vision/OCR, transcription or speech: the Nexora API router type. */
  usage: NexoraModelUsage
  source: NexoraModelSource
  providerModel: string
  providerUrl: string | null
}

export interface AddNexoraModelInput {
  source: NexoraModelSource
  model: string
  /** Chat by default. */
  usage?: NexoraModelUsage
  /** Address of an OpenAI-compatible service, without `/v1`. */
  url?: string
  key?: string
  /** Size in billions of parameters, for the carbon footprint Nexora API computes. */
  totalParams?: number
}

/** Nexora API's administration cannot be reached or refuses WorkStudio's admin key. */
export class NexoraModelAdminUnavailableError extends Error {
  constructor(detail: string) {
    super(`Nexora API model administration is unavailable: ${detail}`)
    this.name = 'NexoraModelAdminUnavailableError'
  }
}

type NexoraModelErrorCode = 'unreachable' | 'duplicate' | 'is-default' | 'not-found' | 'invalid'

/** A request Nexora API refused for a reason the person can act on. */
export class NexoraModelError extends Error {
  constructor(
    readonly code: NexoraModelErrorCode,
    detail: string
  ) {
    super(detail)
    this.name = 'NexoraModelError'
  }
}

interface NexoraModelAdminConfig {
  /** Nexora API origin, without `/v1`. */
  adminBaseUrl: string
  adminKey: string
  /** WorkStudio's own model key, used to try a model like a block would. */
  apiKey: string
}

interface NexoraModelAdminOptions {
  config?: NexoraModelAdminConfig
  fetchFn?: typeof fetch
}

interface ApiRouter {
  id: number
  name: string
  type: string
  aliases?: string[]
  load_balancing_strategy: string
  cost_prompt_tokens: number
  cost_completion_tokens: number
}

interface ApiProvider {
  id: number
  router_id: number
  url: string | null
  model_name: string
}

const OLLAMA_PROVIDER_URL = 'http://ollama:11434'
const MISTRAL_PROVIDER_URL = 'https://api.mistral.ai'
const WORKSTUDIO_ROLE = 'workstudio'
const LIMIT_TYPES = ['rpm', 'rpd', 'tpm', 'tpd'] as const
const ROUTER_FIELDS = [
  'name',
  'type',
  'aliases',
  'load_balancing_strategy',
  'cost_prompt_tokens',
  'cost_completion_tokens',
] as const
/** Chat answers come fast; a local vision or transcription model on a CPU takes minutes. */
/**
 * Billions of parameters read from a model name (`qwen2.5:7b` ⇒ 7), so Nexora API can measure the
 * footprint (EcoLogits needs the size); 0 when the name does not say.
 */
function modelSizeBillions(name: string): number {
  const size = /(\d+(?:\.\d+)?)\s*b(?![a-z])/i.exec(name)
  return size ? Math.max(1, Math.round(Number(size[1]))) : 0
}

/**
 * Where the model runs, for the electricity mix of the footprint: a local model runs on the
 * instance's server (a French SME's, by default), Mistral AI in France, anything else unknown.
 */
function footprintParams(size: number) {
  return size > 0 ? { model_total_params: size, model_active_params: size } : {}
}

function hostingZone(source: NexoraModelSource): string {
  return source === 'openai-compatible' ? 'WOR' : 'FRA'
}

/** A 7B model on a CPU-only server needs minutes for a long prompt (agents with tools). */
const PROVIDER_TIMEOUT_SECONDS: Record<NexoraModelUsage, number> = {
  chat: 600,
  vision: 600,
  transcription: 3600,
  speech: 600,
}
/** What « Tester » has a speech model say. */
const SPEECH_TEST_TEXT = 'Bonjour, ceci est un essai de la voix de Nexora.'
/** A short sample read by « Tester » on a vision model: the word « Nexora », black on white. */
const SAMPLE_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAABAAgMAAAAi1dC4AAAADFBMVEUEBAT///+lpaVZWVnj7/xyAAAACXBIWXMAAAsTAAALEwEAmpwYAAABmUlEQVRIx+3UP26DMBQG8A8sBqSSTOxdcoSoa46QgUeiJAPq2KUcwUfoYrVDh6zNlCOwdKzUhSN06Rkqtd8zUZsBD3SMsIRkMD/g/cGQwQMjGclILomUByebwyCyRiJLM5Ckw0k0nMTDCf5BWiX35kPuXnzyjhPhdJtuvnitn+QkJZBJZaSOZQfMpYpsVum1XtLMSSjh1nA2E+t1DCXoJzYh0eV8hZxV4syfe9L2kn1GsohLfg5u1KUVXIXp261sMeslzxGJTaVJxF7BFcjXyKvu+QHyZEj0/lRqaFTtSokuHvjmPvKIByOYfjcZkxXxcCvMmDwpGwSIw7vRmJmngg23AzM+q2LxKQmQ5vqPJGdkESYLRgBzhd8PUxKJNBMXIhp0t1ZxdoqFRGsUIEv4jHFY3wIt8+zJvAyRHQkbpXz1pSww26Ht3lKESEFS4/OYaMPwyaaB+FjifYjwJlkyO0nXlqxG7IkNZ4zpkpWSrvlrsDpKasRBYlnqI4xbcBsAe5H9pWSNeS85389Ogz9nNw7jzj+SkVwY+QFHMuj69VKfAwAAAABJRU5ErkJggg=='
/** Local files the knowledge bases need, whatever the model list says. */
const PROTECTED_LOCAL_MODELS = new Set(['bge-m3'])

function configFromEnv(): NexoraModelAdminConfig {
  return {
    adminBaseUrl: (env.VLLM_BASE_URL ?? '').trim().replace(/\/+$/, '').replace(/\/v1$/, ''),
    adminKey: env.NEXORA_API_ADMIN_KEY?.trim() ?? '',
    apiKey: env.VLLM_API_KEY?.trim() ?? '',
  }
}

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, '').replace(/\/v1$/, '').toLowerCase()
}

function sourceOf(url: string | null): NexoraModelSource {
  const normalized = url ? normalizeUrl(url) : ''
  if (normalized === OLLAMA_PROVIDER_URL) return 'ollama'
  if (normalized === MISTRAL_PROVIDER_URL) return 'mistral'
  return 'openai-compatible'
}

function createClient(options: NexoraModelAdminOptions) {
  const config = options.config ?? configFromEnv()
  const fetchFn = options.fetchFn ?? fetch

  async function call<T>(
    method: string,
    path: string,
    { body, timeoutMs = 15_000, token = config.adminKey } = {} as {
      body?: unknown
      timeoutMs?: number
      token?: string
    }
  ): Promise<{ status: number; data: T }> {
    if (!config.adminBaseUrl || !token) {
      throw new NexoraModelAdminUnavailableError('not configured')
    }
    let response: Response
    try {
      // boundary-raw-fetch: Nexora API is a separate service, not a same-origin route
      response = await fetchFn(`${config.adminBaseUrl}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (error) {
      throw new NexoraModelAdminUnavailableError(getErrorMessage(error, 'request failed'))
    }
    if (response.status === 401 || response.status === 403 || response.status >= 500) {
      throw new NexoraModelAdminUnavailableError(
        `${method} ${path} answered HTTP ${response.status}`
      )
    }
    const data = (response.status === 204 ? {} : await response.json().catch(() => ({}))) as T
    return { status: response.status, data }
  }

  async function expectOk<T>(
    method: string,
    path: string,
    init?: { body?: unknown; timeoutMs?: number }
  ): Promise<T> {
    const { status, data } = await call<T>(method, path, init)
    if (status === 404) throw new NexoraModelError('not-found', `${method} ${path}: not found`)
    if (status >= 400) {
      throw new NexoraModelAdminUnavailableError(`${method} ${path} answered HTTP ${status}`)
    }
    return data
  }

  const routers = async () =>
    (await expectOk<{ data?: ApiRouter[] }>('GET', '/v1/admin/routers?limit=100')).data ?? []
  const providers = async (routerId?: number) =>
    (
      await expectOk<{ data?: ApiProvider[] }>(
        'GET',
        `/v1/admin/providers?limit=100${routerId === undefined ? '' : `&router_id=${routerId}`}`
      )
    ).data ?? []

  async function updateRouter(router: ApiRouter, aliases: string[]): Promise<void> {
    const body = Object.fromEntries(ROUTER_FIELDS.map((field) => [field, router[field] ?? []]))
    await expectOk('PATCH', `/v1/admin/routers/${router.id}`, { body: { ...body, aliases } })
  }

  return { config, fetchFn, call, expectOk, routers, providers, updateRouter }
}

function toModel(
  router: ApiRouter,
  usage: NexoraModelUsage,
  provider: ApiProvider | undefined
): NexoraModel {
  return {
    id: router.id,
    name: router.name,
    isDefault: (router.aliases ?? []).includes(DEFAULT_MODEL_ALIAS),
    usage,
    source: sourceOf(provider?.url ?? null),
    providerModel: provider?.model_name ?? router.name,
    providerUrl: provider?.url ? normalizeUrl(provider.url) : null,
  }
}

/** The chat, vision and transcription models Nexora API serves, the default one first. */
export async function listNexoraModels(
  options: NexoraModelAdminOptions = {}
): Promise<NexoraModel[]> {
  const client = createClient(options)
  const [routers, providers] = await Promise.all([client.routers(), client.providers()])
  const models = routers.flatMap((router) => {
    const usage = usageOfRouterType(router.type)
    if (!usage) return []
    return [
      toModel(
        router,
        usage,
        providers.find((p) => p.router_id === router.id)
      ),
    ]
  })
  return [...models.filter((m) => m.isDefault), ...models.filter((m) => !m.isDefault)]
}

/**
 * Adds a model as its own Nexora API router (typed after its usage) and provider, then lets
 * WorkStudio's key use it (a role without a limit for a router is refused by Nexora API). Nexora
 * API checks that the provider answers before saving it; when it does not, the new router is
 * removed again. Mistral OCR and Voxtral need Nexora API's Mistral provider type (its own OCR
 * route, audio through chat); every other model is reached as an OpenAI-compatible service, a
 * local vision model through chat completions.
 */
export async function addNexoraModel(
  input: AddNexoraModelInput,
  options: NexoraModelAdminOptions = {}
): Promise<NexoraModel> {
  const client = createClient(options)
  const name = input.model.trim()
  const key = input.key?.trim() || 'none'
  const usage = input.usage ?? 'chat'
  if (!name) throw new NexoraModelError('invalid', 'model name is empty')
  if (input.source === 'mistral' && key === 'none') {
    throw new NexoraModelError('invalid', 'a Mistral AI key is required')
  }
  if (input.source === 'ollama' && usage === 'transcription') {
    throw new NexoraModelError('invalid', 'Ollama cannot transcribe speech')
  }
  if (usage === 'speech' && input.source !== 'openai-compatible') {
    throw new NexoraModelError('invalid', 'speech synthesis needs an OpenAI-compatible service')
  }
  const url =
    input.source === 'ollama'
      ? OLLAMA_PROVIDER_URL
      : input.source === 'mistral'
        ? MISTRAL_PROVIDER_URL
        : normalizeUrl(input.url ?? '')
  if (!/^https?:\/\/[^/\s]+/.test(url)) throw new NexoraModelError('invalid', 'service address')

  const existing = await client.routers()
  if (existing.some((r) => [r.name, ...(r.aliases ?? [])].includes(name))) {
    throw new NexoraModelError('duplicate', `${name} already exists`)
  }
  const created = await client.call<{ id?: number }>('POST', '/v1/admin/routers', {
    body: { name, type: ROUTER_TYPE_BY_USAGE[usage], aliases: [] },
  })
  if (created.status === 409) throw new NexoraModelError('duplicate', `${name} already exists`)
  const routerId = created.data.id
  if (created.status >= 400 || typeof routerId !== 'number') {
    throw new NexoraModelAdminUnavailableError(`router creation answered HTTP ${created.status}`)
  }

  const provider = await client
    .call<{ id?: number; detail?: string }>('POST', '/v1/admin/providers', {
      body: {
        router_id: routerId,
        type: input.source === 'mistral' && usage !== 'chat' ? 'mistral' : 'openai',
        url,
        key,
        model_name: name,
        timeout: PROVIDER_TIMEOUT_SECONDS[usage],
        ...footprintParams(
          input.totalParams ? Math.round(input.totalParams) : modelSizeBillions(name)
        ),
        model_hosting_zone: hostingZone(input.source),
      },
      timeoutMs: 120_000,
    })
    .catch(async (error: unknown) => {
      await client.call('DELETE', `/v1/admin/routers/${routerId}`).catch(() => undefined)
      throw error
    })
  if (provider.status >= 400) {
    await client.call('DELETE', `/v1/admin/routers/${routerId}`).catch(() => undefined)
    throw new NexoraModelError(
      'unreachable',
      provider.data.detail ?? `provider answered HTTP ${provider.status}`
    )
  }

  const roles = (
    await client.expectOk<{
      data?: { id: number; name: string; permissions: string[]; limits: unknown[] }[]
    }>('GET', '/v1/admin/roles?limit=100')
  ).data
  const role = roles?.find((r) => r.name === WORKSTUDIO_ROLE)
  if (role) {
    const limits = [
      ...role.limits,
      ...LIMIT_TYPES.map((type) => ({ router_id: routerId, type, value: null })),
    ]
    await client.expectOk('PATCH', `/v1/admin/roles/${role.id}`, {
      body: { name: role.name, permissions: role.permissions, limits },
    })
  }

  return {
    id: routerId,
    name,
    isDefault: false,
    usage,
    source: input.source,
    providerModel: name,
    providerUrl: url,
  }
}

/**
 * Makes a model the default: moves the `nexora-default` alias onto its router, so every block,
 * template and generation that asks for `nexora-default` follows. The alias is unique, so it
 * leaves the previous router first; it goes back there when the new router refuses it.
 */
export async function setDefaultNexoraModel(
  id: number,
  options: NexoraModelAdminOptions = {}
): Promise<void> {
  const client = createClient(options)
  const routers = await client.routers()
  const target = routers.find((r) => r.id === id && r.type === 'text-generation')
  if (!target) throw new NexoraModelError('not-found', `model ${id} not found`)
  if ((target.aliases ?? []).includes(DEFAULT_MODEL_ALIAS)) return
  const previous = routers.find((r) => (r.aliases ?? []).includes(DEFAULT_MODEL_ALIAS))

  if (previous) {
    await client.updateRouter(
      previous,
      (previous.aliases ?? []).filter((alias) => alias !== DEFAULT_MODEL_ALIAS)
    )
  }
  try {
    await client.updateRouter(target, [...(target.aliases ?? []), DEFAULT_MODEL_ALIAS])
  } catch (error) {
    if (previous) await client.updateRouter(previous, previous.aliases ?? []).catch(() => undefined)
    throw error
  }
}

/**
 * Removes a model of any usage (its router and providers). The default model cannot go. Returns the
 * bundled Ollama's model name when no remaining model uses it, so its file can be deleted.
 */
export async function removeNexoraModel(
  id: number,
  options: NexoraModelAdminOptions = {}
): Promise<{ removedLocalModel: string | null }> {
  const client = createClient(options)
  const [routers, providers] = await Promise.all([client.routers(), client.providers()])
  const isDefault = (r: ApiRouter) => (r.aliases ?? []).includes(DEFAULT_MODEL_ALIAS)
  const router = routers.find((r) => r.id === id && usageOfRouterType(r.type) !== null)
  if (!router) throw new NexoraModelError('not-found', `model ${id} not found`)
  if (isDefault(router))
    throw new NexoraModelError('is-default', 'the default model cannot be removed')
  // Another admin may have made it the default meanwhile: read it again right before deleting.
  const current = (await client.routers()).find((r) => r.id === id)
  if (current && isDefault(current)) {
    throw new NexoraModelError('is-default', 'the default model cannot be removed')
  }
  await client.expectOk('DELETE', `/v1/admin/routers/${id}`)

  const local = providers.find((p) => p.router_id === id && sourceOf(p.url) === 'ollama')
  const embeddingModel = env.KB_EMBEDDING_MODEL?.replace(/^ollama\//, '')
  const stillUsed = providers.some(
    (p) => p.router_id !== id && sourceOf(p.url) === 'ollama' && p.model_name === local?.model_name
  )
  if (
    !local ||
    stillUsed ||
    PROTECTED_LOCAL_MODELS.has(local.model_name) ||
    local.model_name === embeddingModel
  ) {
    return { removedLocalModel: null }
  }
  return { removedLocalModel: local.model_name }
}

/** One second of silence, as a 16 kHz mono WAV: enough for a transcription model to answer. */
function silentWav(seconds = 1, sampleRate = 16_000): Uint8Array<ArrayBuffer> {
  const dataBytes = seconds * sampleRate * 2
  const wav = new Uint8Array(new ArrayBuffer(44 + dataBytes))
  const view = new DataView(wav.buffer)
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i))
  }
  ascii(0, 'RIFF')
  view.setUint32(4, 36 + dataBytes, true)
  ascii(8, 'WAVE')
  ascii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  ascii(36, 'data')
  view.setUint32(40, dataBytes, true)
  return wav
}

/** What « Tester » found out about a chat model; `null` when it could not tell. */
interface NexoraModelCapabilities {
  reasoning: boolean | null
  tools: boolean | null
}

export interface NexoraModelTestResult {
  latencyMs: number
  reply: string
  /** A reasoning model spent the whole answer budget thinking: there is no answer to show. */
  truncated: boolean
  capabilities: NexoraModelCapabilities
}

/** Room for a reasoning model to think before its one-sentence answer. */
const TEST_MAX_TOKENS = 1024
const TEST_PROMPT = 'Réponds en une phrase : qui es-tu ?'
const PROBE_TOOL = {
  type: 'function',
  function: {
    name: 'heure_actuelle',
    description: "Donne l'heure actuelle.",
    parameters: { type: 'object', properties: {} },
  },
}

interface TestResponse {
  status: number
  reply: string
  detail?: string
  reasoning?: string
}

async function testRequest(
  client: ReturnType<typeof createClient>,
  name: string,
  usage: NexoraModelUsage
): Promise<TestResponse> {
  if (usage === 'vision') {
    const { status, data } = await client.call<{
      pages?: { markdown?: string | null }[]
      detail?: string
    }>('POST', '/v1/ocr', {
      token: client.config.apiKey,
      timeoutMs: 600_000,
      body: { model: name, document: { type: 'image_url', image_url: SAMPLE_IMAGE } },
    })
    const reply = (data.pages ?? []).map((page) => page.markdown ?? '').join('\n')
    return { status, reply, detail: data.detail }
  }
  if (usage === 'transcription') {
    const form = new FormData()
    form.append('file', new Blob([silentWav()], { type: 'audio/wav' }), 'nexora-test.wav')
    form.append('model', name)
    let response: Response
    try {
      // boundary-raw-fetch: Nexora API is a separate service, not a same-origin route
      response = await client.fetchFn(`${client.config.adminBaseUrl}/v1/audio/transcriptions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${client.config.apiKey}` },
        body: form,
        signal: AbortSignal.timeout(600_000),
      })
    } catch (error) {
      throw new NexoraModelAdminUnavailableError(getErrorMessage(error, 'request failed'))
    }
    const data = (await response.json().catch(() => ({}))) as { text?: string; detail?: string }
    return { status: response.status, reply: data.text ?? '', detail: data.detail }
  }
  if (usage === 'speech') {
    let response: Response
    try {
      // boundary-raw-fetch: Nexora API is a separate service, not a same-origin route
      response = await client.fetchFn(`${client.config.adminBaseUrl}/v1/audio/speech`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${client.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: name, input: SPEECH_TEST_TEXT, response_format: 'wav' }),
        signal: AbortSignal.timeout(600_000),
      })
    } catch (error) {
      throw new NexoraModelAdminUnavailableError(getErrorMessage(error, 'request failed'))
    }
    if (!response.ok) {
      const failure = (await response.json().catch(() => ({}))) as { detail?: string }
      return { status: response.status, reply: '', detail: failure.detail }
    }
    const audio = await response.arrayBuffer()
    return { status: response.status, reply: `${response.headers.get('content-type') ?? 'audio'}, ${audio.byteLength} bytes` }
  }
  const { status, data } = await client.call<{
    choices?: { message?: unknown }[]
    detail?: string
  }>('POST', '/v1/chat/completions', {
    token: client.config.apiKey,
    timeoutMs: 300_000,
    body: {
      model: name,
      messages: [{ role: 'user', content: TEST_PROMPT }],
      max_tokens: TEST_MAX_TOKENS,
      temperature: 0,
    },
  })
  const { content, reasoning } = readMessageReasoning(data.choices?.[0]?.message)
  return { status, reply: content, reasoning, detail: data.detail }
}

/**
 * Whether the model accepts a tool definition: a refused request body (400, 422) says no; any
 * other answer (authentication, rate limit, timeout, service failure) says nothing (`null`).
 */
async function probeTools(
  client: ReturnType<typeof createClient>,
  name: string
): Promise<boolean | null> {
  try {
    const { status } = await client.call('POST', '/v1/chat/completions', {
      token: client.config.apiKey,
      timeoutMs: 300_000,
      body: {
        model: name,
        messages: [{ role: 'user', content: TEST_PROMPT }],
        tools: [PROBE_TOOL],
        max_tokens: 16,
        temperature: 0,
      },
    })
    if (status < 300) return true
    return status === 400 || status === 422 ? false : null
  } catch {
    return null
  }
}

/**
 * Tries a model with WorkStudio's own key, like a block would: a short question for a chat
 * model, a sample image for a vision model, a second of silence for a transcription model, a short sentence to say for a speech model. A chat
 * model's answer comes without its reasoning; whether it reasons and accepts tools is reported.
 */
export async function testNexoraModel(
  name: string,
  options: NexoraModelAdminOptions = {},
  usage: NexoraModelUsage = 'chat'
): Promise<NexoraModelTestResult> {
  const client = createClient(options)
  const started = performance.now()
  const { status, reply, detail, reasoning } = await testRequest(client, name, usage)
  if (status === 404) throw new NexoraModelError('not-found', `${name} is not served`)
  if (status >= 400) {
    throw new NexoraModelError('unreachable', detail ?? `model answered HTTP ${status}`)
  }
  const latencyMs = Math.round(performance.now() - started)
  const answer = reply.trim()
  if (usage !== 'chat') {
    return {
      latencyMs,
      reply: answer,
      truncated: false,
      capabilities: { reasoning: null, tools: null },
    }
  }
  const hasReasoning = Boolean(reasoning?.trim())
  return {
    latencyMs,
    reply: answer,
    truncated: !answer && hasReasoning,
    capabilities: { reasoning: hasReasoning, tools: await probeTools(client, name) },
  }
}
