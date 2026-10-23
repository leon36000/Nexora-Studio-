import { jsonResponse } from '@sim/testing/helpers/http'
import { describe, expect, it } from 'vitest'
import {
  addNexoraModel,
  listNexoraModels,
  NexoraModelAdminUnavailableError,
  NexoraModelError,
  removeNexoraModel,
  setDefaultNexoraModel,
  testNexoraModel,
} from '@/lib/nexora/model-admin'

const ADMIN_KEY = 'admin-key'
const API_KEY = 'workstudio-key'
const ROUTER_FIELDS = [
  'aliases',
  'cost_completion_tokens',
  'cost_prompt_tokens',
  'load_balancing_strategy',
  'name',
  'type',
]

interface FakeRouter {
  id: number
  name: string
  type: string
  aliases: string[]
  load_balancing_strategy: string
  cost_prompt_tokens: number
  cost_completion_tokens: number
}

interface FakeProvider {
  id: number
  router_id: number
  type: string
  url: string
  model_name: string
  key?: string
  model_total_params?: number
}

/**
 * In-memory Nexora API admin surface, with the rules WorkStudio depends on: unique names and
 * aliases, full-body router PATCH, provider reachability check (HTTP 424), cascade on router
 * deletion, role limits replaced as a whole.
 */
function fakeNexoraApi() {
  let nextId = 100
  const state = {
    routers: [] as FakeRouter[],
    providers: [] as FakeProvider[],
    roles: [
      { id: 1, name: 'workstudio', permissions: [] as string[], limits: [] as unknown[] },
      { id: 2, name: 'other', permissions: ['admin'], limits: [] as unknown[] },
    ],
    unreachableUrls: new Set<string>(),
    failPatchOfRouter: null as number | null,
    down: false,
    patches: 0,
    routerLists: 0,
    ocrRequests: [] as { document: { image_url: string } }[],
    transcriptionFiles: [] as File[],
    /** Simulates another admin making this router the default between two reads. */
    makeDefaultOnSecondList: null as number | null,
  }

  function addRouter(
    name: string,
    aliases: string[],
    provider: Omit<FakeProvider, 'id' | 'router_id' | 'type'>,
    type = 'text-generation'
  ) {
    const router: FakeRouter = {
      id: nextId++,
      name,
      type,
      aliases,
      load_balancing_strategy: 'shuffle',
      cost_prompt_tokens: 0,
      cost_completion_tokens: 0,
    }
    state.routers.push(router)
    state.providers.push({ id: nextId++, router_id: router.id, type: 'openai', ...provider })
    return router
  }

  const taken = (names: string[], exceptId?: number) =>
    state.routers.some(
      (r) => r.id !== exceptId && [r.name, ...r.aliases].some((n) => names.includes(n))
    )

  const fetchFn = async (input: string | URL | Request, init?: RequestInit) => {
    if (state.down) throw new TypeError('fetch failed')
    const url = new URL(String(input))
    const method = init?.method ?? 'GET'
    const auth = new Headers(init?.headers).get('Authorization')
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    const path = url.pathname

    if (path === '/v1/chat/completions') {
      if (auth !== `Bearer ${API_KEY}`) return jsonResponse({}, 401)
      const known = state.routers.some((r) => [r.name, ...r.aliases].includes(body.model))
      if (!known) return jsonResponse({ detail: 'Model not found' }, 404)
      return jsonResponse({ choices: [{ message: { content: ` Bonjour (${body.model}) ` } }] })
    }
    if (path === '/v1/ocr') {
      if (auth !== `Bearer ${API_KEY}`) return jsonResponse({}, 401)
      const router = state.routers.find((r) => [r.name, ...r.aliases].includes(body.model))
      if (router?.type !== 'image-to-text') return jsonResponse({ detail: 'Model not found' }, 404)
      state.ocrRequests.push(body)
      return jsonResponse({ pages: [{ index: 0, images: [], markdown: ' Nexora ' }] })
    }
    if (path === '/v1/audio/transcriptions') {
      if (auth !== `Bearer ${API_KEY}`) return jsonResponse({}, 401)
      const form = init?.body as FormData
      const router = state.routers.find((r) => [r.name, ...r.aliases].includes(String(form.get('model'))))
      if (router?.type !== 'automatic-speech-recognition') {
        return jsonResponse({ detail: 'Model not found' }, 404)
      }
      state.transcriptionFiles.push(form.get('file') as File)
      return jsonResponse({ text: ' Bonjour. ' })
    }
    if (auth !== `Bearer ${ADMIN_KEY}`) return jsonResponse({}, 401)

    if (path === '/v1/admin/routers' && method === 'GET') {
      state.routerLists++
      if (state.makeDefaultOnSecondList !== null && state.routerLists === 2) {
        for (const r of state.routers) r.aliases = r.aliases.filter((a) => a !== 'nexora-default')
        state.routers
          .find((r) => r.id === state.makeDefaultOnSecondList)
          ?.aliases.push('nexora-default')
      }
      return jsonResponse({ data: state.routers.map((r) => ({ ...r, aliases: [...r.aliases] })) })
    }
    if (path === '/v1/admin/routers' && method === 'POST') {
      if (taken([body.name, ...(body.aliases ?? [])]))
        return jsonResponse({ detail: 'exists' }, 409)
      const router: FakeRouter = {
        id: nextId++,
        name: body.name,
        type: body.type,
        aliases: body.aliases ?? [],
        load_balancing_strategy: 'shuffle',
        cost_prompt_tokens: 0,
        cost_completion_tokens: 0,
      }
      state.routers.push(router)
      return jsonResponse({ id: router.id }, 201)
    }
    const routerMatch = path.match(/^\/v1\/admin\/routers\/(\d+)$/)
    if (routerMatch) {
      const id = Number(routerMatch[1])
      const router = state.routers.find((r) => r.id === id)
      if (!router) return jsonResponse({ detail: 'not found' }, 404)
      if (method === 'PATCH') {
        state.patches++
        if (state.failPatchOfRouter === id) return jsonResponse({ detail: 'boom' }, 500)
        if (JSON.stringify(Object.keys(body).sort()) !== JSON.stringify(ROUTER_FIELDS))
          return jsonResponse({ detail: 'missing fields' }, 422)
        if (taken([body.name, ...body.aliases], id)) return jsonResponse({ detail: 'exists' }, 409)
        Object.assign(router, body)
        return jsonResponse({ id })
      }
      if (method === 'DELETE') {
        state.routers = state.routers.filter((r) => r.id !== id)
        state.providers = state.providers.filter((p) => p.router_id !== id)
        return new Response(null, { status: 204 })
      }
    }
    if (path === '/v1/admin/providers' && method === 'GET') {
      const routerId = url.searchParams.get('router_id')
      const listed = state.providers
        .filter((p) => routerId === null || p.router_id === Number(routerId))
        .map(({ key: _key, ...p }) => p)
      return jsonResponse({ data: listed })
    }
    if (path === '/v1/admin/providers' && method === 'POST') {
      if (state.unreachableUrls.has(body.url))
        return jsonResponse(
          { detail: `Model provider ${body.model_name} not reachable (500)` },
          424
        )
      const provider = { id: nextId++, ...body }
      state.providers.push(provider)
      return jsonResponse({ id: provider.id }, 201)
    }
    if (path === '/v1/admin/roles' && method === 'GET') {
      return jsonResponse({ data: state.roles })
    }
    const roleMatch = path.match(/^\/v1\/admin\/roles\/(\d+)$/)
    if (roleMatch && method === 'PATCH') {
      const role = state.roles.find((r) => r.id === Number(roleMatch[1]))
      if (!role || !body.name || !body.permissions || !body.limits)
        return jsonResponse({ detail: 'bad' }, 422)
      Object.assign(role, body)
      return jsonResponse({ id: role.id })
    }
    return jsonResponse({ detail: `unexpected ${method} ${path}` }, 404)
  }

  return { state, fetchFn: fetchFn as typeof fetch, addRouter }
}

function setup() {
  const api = fakeNexoraApi()
  const qwen = api.addRouter('qwen2.5:7b', ['nexora-default'], {
    url: 'http://ollama:11434/',
    model_name: 'qwen2.5:7b',
  })
  const options = {
    config: {
      adminBaseUrl: 'http://nexora-api:8000',
      adminKey: ADMIN_KEY,
      apiKey: API_KEY,
    },
    fetchFn: api.fetchFn,
  }
  return { ...api, qwen, options }
}

describe('listNexoraModels', () => {
  it('lists chat models with their source and the default one', async () => {
    const { addRouter, options } = setup()
    addRouter('mistral-small-latest', [], {
      url: 'https://api.mistral.ai/',
      model_name: 'mistral-small-latest',
    })
    const models = await listNexoraModels(options)
    expect(models.map((m) => [m.name, m.source, m.isDefault])).toEqual([
      ['qwen2.5:7b', 'ollama', true],
      ['mistral-small-latest', 'mistral', false],
    ])
  })
})

describe('model usages', () => {
  it('lists vision and transcription models with their usage, never the embedding models', async () => {
    const { addRouter, options } = setup()
    addRouter(
      'qwen2.5vl:3b',
      [],
      { url: 'http://ollama:11434', model_name: 'qwen2.5vl:3b' },
      'image-to-text'
    )
    addRouter(
      'whisper-small',
      [],
      { url: 'http://whisper:8000', model_name: 'Systran/faster-whisper-small' },
      'automatic-speech-recognition'
    )
    addRouter(
      'bge-m3',
      [],
      { url: 'http://ollama:11434', model_name: 'bge-m3' },
      'text-embeddings-inference'
    )
    const models = await listNexoraModels(options)
    expect(models.map((m) => [m.name, m.usage, m.isDefault])).toEqual([
      ['qwen2.5:7b', 'chat', true],
      ['qwen2.5vl:3b', 'vision', false],
      ['whisper-small', 'transcription', false],
    ])
  })

  it('adds a local vision model as an image-to-text router read by chat completions', async () => {
    const { state, options } = setup()
    const model = await addNexoraModel(
      { source: 'ollama', model: 'qwen2.5vl:3b', usage: 'vision', totalParams: 3.8 },
      options
    )
    expect(model).toMatchObject({ usage: 'vision', isDefault: false })
    expect(state.routers.find((r) => r.id === model.id)?.type).toBe('image-to-text')
    expect(state.providers.find((p) => p.router_id === model.id)).toMatchObject({
      type: 'openai',
      url: 'http://ollama:11434',
      timeout: 600,
    })
  })

  it('adds Mistral OCR and Voxtral through the Mistral provider type', async () => {
    const { state, options } = setup()
    const ocr = await addNexoraModel(
      { source: 'mistral', model: 'mistral-ocr-latest', key: 'k', usage: 'vision' },
      options
    )
    const voice = await addNexoraModel(
      { source: 'mistral', model: 'voxtral-mini-latest', key: 'k', usage: 'transcription' },
      options
    )
    expect(state.routers.find((r) => r.id === voice.id)?.type).toBe('automatic-speech-recognition')
    expect(state.providers.find((p) => p.router_id === ocr.id)?.type).toBe('mistral')
    expect(state.providers.find((p) => p.router_id === voice.id)?.type).toBe('mistral')
  })

  it('keeps chat models on the OpenAI-compatible provider type', async () => {
    const { state, options } = setup()
    const chat = await addNexoraModel(
      { source: 'mistral', model: 'mistral-small-latest', key: 'k' },
      options
    )
    expect(chat.usage).toBe('chat')
    expect(state.providers.find((p) => p.router_id === chat.id)).toMatchObject({
      type: 'openai',
      timeout: 120,
    })
  })

  it('refuses a transcription model on Ollama, which cannot transcribe, before creating anything', async () => {
    const { state, options } = setup()
    await expect(
      addNexoraModel({ source: 'ollama', model: 'whisper:small', usage: 'transcription' }, options)
    ).rejects.toMatchObject({ code: 'invalid' })
    expect(state.routers).toHaveLength(1)
  })

  it('never makes a vision or transcription model the default, but removes it', async () => {
    const { state, options } = setup()
    const vision = await addNexoraModel(
      { source: 'ollama', model: 'qwen2.5vl:3b', usage: 'vision' },
      options
    )
    await expect(setDefaultNexoraModel(vision.id, options)).rejects.toMatchObject({
      code: 'not-found',
    })
    expect(state.patches).toBe(0)
    expect(await removeNexoraModel(vision.id, options)).toEqual({
      removedLocalModel: 'qwen2.5vl:3b',
    })
  })

  it('tests a vision model on a sample image and a transcription model on a short sound', async () => {
    const { state, addRouter, options } = setup()
    addRouter(
      'qwen2.5vl:3b',
      [],
      { url: 'http://ollama:11434', model_name: 'qwen2.5vl:3b' },
      'image-to-text'
    )
    addRouter(
      'whisper-small',
      [],
      { url: 'http://whisper:8000', model_name: 'w' },
      'automatic-speech-recognition'
    )

    expect((await testNexoraModel('qwen2.5vl:3b', options, 'vision')).reply).toBe('Nexora')
    expect(state.ocrRequests[0].document.image_url).toMatch(/^data:image\/png;base64,/)

    expect((await testNexoraModel('whisper-small', options, 'transcription')).reply).toBe(
      'Bonjour.'
    )
    const sound = state.transcriptionFiles[0]
    expect(sound.type).toBe('audio/wav')
    expect(new TextDecoder().decode((await sound.arrayBuffer()).slice(0, 4))).toBe('RIFF')
  })
})

describe('addNexoraModel', () => {
  it('adds a model as its own router, provider and unlimited workstudio limits', async () => {
    const { state, options } = setup()
    const model = await addNexoraModel(
      { source: 'mistral', model: 'mistral-small-latest', key: 'secret', totalParams: 24 },
      options
    )
    expect(model).toMatchObject({
      name: 'mistral-small-latest',
      source: 'mistral',
      isDefault: false,
    })
    const provider = state.providers.find((p) => p.router_id === model.id)
    expect(provider).toMatchObject({
      type: 'openai',
      url: 'https://api.mistral.ai',
      model_name: 'mistral-small-latest',
      key: 'secret',
      model_total_params: 24,
    })
    const workstudio = state.roles.find((r) => r.name === 'workstudio')
    expect(workstudio?.limits).toEqual(
      ['rpm', 'rpd', 'tpm', 'tpd'].map((type) => ({ router_id: model.id, type, value: null }))
    )
  })

  it('points a local model at the bundled Ollama without a key', async () => {
    const { state, options } = setup()
    const model = await addNexoraModel({ source: 'ollama', model: 'qwen2.5:3b' }, options)
    expect(state.providers.find((p) => p.router_id === model.id)).toMatchObject({
      url: 'http://ollama:11434',
      key: 'none',
    })
  })

  it('reports an unreachable provider and leaves no empty router behind', async () => {
    const { state, options } = setup()
    state.unreachableUrls.add('http://host.docker.internal:18141')
    await expect(
      addNexoraModel(
        { source: 'openai-compatible', model: 'llama3', url: 'http://host.docker.internal:18141/' },
        options
      )
    ).rejects.toMatchObject({ code: 'unreachable' })
    expect(state.routers.map((r) => r.name)).toEqual(['qwen2.5:7b'])
  })

  it('refuses a name already used by a model or an alias', async () => {
    const { options } = setup()
    for (const model of ['qwen2.5:7b', 'nexora-default']) {
      await expect(addNexoraModel({ source: 'ollama', model }, options)).rejects.toMatchObject({
        code: 'duplicate',
      })
    }
  })
})

describe('setDefaultNexoraModel', () => {
  it('moves the default alias to the chosen model', async () => {
    const { state, qwen, options } = setup()
    const mistral = await addNexoraModel(
      { source: 'mistral', model: 'mistral-small-latest', key: 'k' },
      options
    )
    await setDefaultNexoraModel(mistral.id, options)
    expect(state.routers.find((r) => r.id === qwen.id)?.aliases).toEqual([])
    expect(state.routers.find((r) => r.id === mistral.id)?.aliases).toEqual(['nexora-default'])
  })

  it('gives the alias back when the chosen model cannot take it', async () => {
    const { state, qwen, options } = setup()
    const mistral = await addNexoraModel(
      { source: 'mistral', model: 'mistral-small-latest', key: 'k' },
      options
    )
    state.failPatchOfRouter = mistral.id
    await expect(setDefaultNexoraModel(mistral.id, options)).rejects.toBeInstanceOf(
      NexoraModelAdminUnavailableError
    )
    expect(state.routers.find((r) => r.id === qwen.id)?.aliases).toEqual(['nexora-default'])
  })

  it('does nothing for the model that is already the default', async () => {
    const { state, qwen, options } = setup()
    await setDefaultNexoraModel(qwen.id, options)
    expect(state.patches).toBe(0)
  })

  it('only makes a chat model the default', async () => {
    const { state, addRouter, options } = setup()
    const embed = addRouter('bge-m3', [], { url: 'http://ollama:11434/', model_name: 'bge-m3' })
    embed.type = 'text-embeddings-inference'
    await expect(setDefaultNexoraModel(embed.id, options)).rejects.toMatchObject({
      code: 'not-found',
    })
    expect(state.patches).toBe(0)
  })

  it('reports an unknown model', async () => {
    const { options } = setup()
    await expect(setDefaultNexoraModel(9999, options)).rejects.toMatchObject({ code: 'not-found' })
  })
})

describe('removeNexoraModel', () => {
  it('refuses to remove the default model', async () => {
    const { qwen, options } = setup()
    await expect(removeNexoraModel(qwen.id, options)).rejects.toMatchObject({ code: 'is-default' })
  })

  it('re-checks the default just before deleting, so a concurrent default change is not lost', async () => {
    const { state, options } = setup()
    const mistral = await addNexoraModel(
      { source: 'mistral', model: 'mistral-small-latest', key: 'k' },
      options
    )
    state.routerLists = 0
    state.makeDefaultOnSecondList = mistral.id
    await expect(removeNexoraModel(mistral.id, options)).rejects.toMatchObject({
      code: 'is-default',
    })
    expect(state.routers.some((r) => r.id === mistral.id)).toBe(true)
  })

  it('names the local model to delete only when no other model uses it, never bge-m3', async () => {
    const { addRouter, options } = setup()
    const small = await addNexoraModel({ source: 'ollama', model: 'qwen2.5:3b' }, options)
    const twin = addRouter('qwen2.5:3b (2)', [], {
      url: 'http://ollama:11434/',
      model_name: 'qwen2.5:3b',
    })
    expect(await removeNexoraModel(twin.id, options)).toEqual({ removedLocalModel: null })
    expect(await removeNexoraModel(small.id, options)).toEqual({ removedLocalModel: 'qwen2.5:3b' })
    const embed = addRouter('bge-m3', [], { url: 'http://ollama:11434/', model_name: 'bge-m3' })
    expect(await removeNexoraModel(embed.id, options)).toEqual({ removedLocalModel: null })
  })
})

describe('unavailable Nexora API', () => {
  it('reports an unavailable administration without a key, on 401 or when unreachable', async () => {
    const { state, options } = setup()
    await expect(
      listNexoraModels({ ...options, config: { ...options.config, adminKey: '' } })
    ).rejects.toBeInstanceOf(NexoraModelAdminUnavailableError)
    await expect(
      listNexoraModels({ ...options, config: { ...options.config, adminKey: 'revoked' } })
    ).rejects.toBeInstanceOf(NexoraModelAdminUnavailableError)
    state.down = true
    await expect(listNexoraModels(options)).rejects.toBeInstanceOf(NexoraModelAdminUnavailableError)
  })
})

describe('testNexoraModel', () => {
  it('returns the trimmed reply and a latency', async () => {
    const { options } = setup()
    const result = await testNexoraModel('nexora-default', options)
    expect(result.reply).toBe('Bonjour (nexora-default)')
    expect(result.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it('reports a model Nexora API does not serve', async () => {
    const { options } = setup()
    await expect(testNexoraModel('absent', options)).rejects.toBeInstanceOf(NexoraModelError)
  })
})
