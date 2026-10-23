import { getErrorMessage } from '@sim/utils/errors'
import { env } from '@/lib/core/config/env'
import { DEFAULT_MODEL_ALIAS } from '@/lib/nexora/model-ids'

/** Where a model runs: the bundled Ollama, Mistral AI, or any OpenAI-compatible service. */
export type NexoraModelSource = 'ollama' | 'mistral' | 'openai-compatible'

export interface NexoraModel {
  /** Nexora API router id. */
  id: number
  /** The name blocks use (`vllm/<name>`). */
  name: string
  isDefault: boolean
  source: NexoraModelSource
  providerModel: string
  providerUrl: string | null
}

export interface AddNexoraModelInput {
  source: NexoraModelSource
  model: string
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

function toModel(router: ApiRouter, provider: ApiProvider | undefined): NexoraModel {
  return {
    id: router.id,
    name: router.name,
    isDefault: (router.aliases ?? []).includes(DEFAULT_MODEL_ALIAS),
    source: sourceOf(provider?.url ?? null),
    providerModel: provider?.model_name ?? router.name,
    providerUrl: provider?.url ? normalizeUrl(provider.url) : null,
  }
}

/** The chat models Nexora API serves, the default one first. */
export async function listNexoraModels(
  options: NexoraModelAdminOptions = {}
): Promise<NexoraModel[]> {
  const client = createClient(options)
  const [routers, providers] = await Promise.all([client.routers(), client.providers()])
  const models = routers
    .filter((router) => router.type === 'text-generation')
    .map((router) =>
      toModel(
        router,
        providers.find((p) => p.router_id === router.id)
      )
    )
  return [...models.filter((m) => m.isDefault), ...models.filter((m) => !m.isDefault)]
}

/**
 * Adds a model as its own Nexora API router and provider, then lets WorkStudio's key use it
 * (a role without a limit for a router is refused by Nexora API). Nexora API checks that the
 * provider answers before saving it; when it does not, the new router is removed again.
 */
export async function addNexoraModel(
  input: AddNexoraModelInput,
  options: NexoraModelAdminOptions = {}
): Promise<NexoraModel> {
  const client = createClient(options)
  const name = input.model.trim()
  const key = input.key?.trim() || 'none'
  if (!name) throw new NexoraModelError('invalid', 'model name is empty')
  if (input.source === 'mistral' && key === 'none') {
    throw new NexoraModelError('invalid', 'a Mistral AI key is required')
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
    body: { name, type: 'text-generation', aliases: [] },
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
        type: 'openai',
        url,
        key,
        model_name: name,
        timeout: 120,
        ...(input.totalParams ? { model_total_params: Math.round(input.totalParams) } : {}),
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
  const target = routers.find((r) => r.id === id)
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
 * Removes a model (its router and providers). The default model cannot go. Returns the
 * bundled Ollama's model name when no remaining model uses it, so its file can be deleted.
 */
export async function removeNexoraModel(
  id: number,
  options: NexoraModelAdminOptions = {}
): Promise<{ removedLocalModel: string | null }> {
  const client = createClient(options)
  const [routers, providers] = await Promise.all([client.routers(), client.providers()])
  const router = routers.find((r) => r.id === id)
  if (!router) throw new NexoraModelError('not-found', `model ${id} not found`)
  if ((router.aliases ?? []).includes(DEFAULT_MODEL_ALIAS)) {
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

/** Asks a model one short question with WorkStudio's own key, like a block would. */
export async function testNexoraModel(
  name: string,
  options: NexoraModelAdminOptions = {}
): Promise<{ latencyMs: number; reply: string }> {
  const client = createClient(options)
  const started = performance.now()
  const { status, data } = await client.call<{
    choices?: { message?: { content?: string } }[]
    detail?: string
  }>('POST', '/v1/chat/completions', {
    token: client.config.apiKey,
    timeoutMs: 120_000,
    body: {
      model: name,
      messages: [{ role: 'user', content: 'Réponds en une phrase : qui es-tu ?' }],
      max_tokens: 60,
      temperature: 0,
    },
  })
  if (status === 404) throw new NexoraModelError('not-found', `${name} is not served`)
  if (status >= 400) {
    throw new NexoraModelError('unreachable', data.detail ?? `model answered HTTP ${status}`)
  }
  return {
    latencyMs: Math.round(performance.now() - started),
    reply: (data.choices?.[0]?.message?.content ?? '').trim(),
  }
}
