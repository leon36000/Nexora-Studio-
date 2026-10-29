import { describe, expect, it, vi } from 'vitest'
import {
  createNexoraGateway,
  type GatewayDependencies,
  NexoraGatewayError,
  requestWorkstudioAccess,
} from '@/lib/nexora/gateway-access'

const GATEWAY = 'https://nexora.example/v1'
const ALICE = 'user-alice'
const BOB = 'user-bob'
const KEY = 'nxk_0123456789abcdefghijklmnopqrstuvwxyz'
const TOKEN = 'oidc-access-token'
const FUTURE = new Date('2030-01-01T00:00:00Z')

interface StoredRow {
  keyEncrypted: string
  model: string
}

/** The key table, the sign-in link, the site and the clock, in memory. */
function world(overrides: Partial<GatewayDependencies> = {}) {
  const state = {
    rows: new Map<string, StoredRow>(),
    links: new Map<string, { accessToken: string | null; expiresAt: Date | null }>([
      [ALICE, { accessToken: TOKEN, expiresAt: FUTURE }],
    ]),
    owners: new Map<string, string>([['ws-alice', ALICE]]),
    siteCalls: [] as string[],
    siteFailure: null as NexoraGatewayError | null,
    clock: new Date('2026-10-29T10:00:00Z').getTime(),
    tail: Promise.resolve() as Promise<unknown>,
  }
  const deps: GatewayDependencies = {
    gatewayUrl: () => GATEWAY,
    billedUserOf: async (workspaceId) => state.owners.get(workspaceId) ?? null,
    readKey: async (userId) => state.rows.get(userId) ?? null,
    writeKey: async (userId, row) => {
      state.rows.set(userId, row)
    },
    readSignIn: async (userId) => state.links.get(userId) ?? null,
    requestAccess: vi.fn(async (accessToken: string) => {
      state.siteCalls.push(accessToken)
      if (state.siteFailure) throw state.siteFailure
      return { key: KEY, model: 'nexora/deepseek-v4.1-flash-1017' }
    }),
    withLock: (_userId, work) => {
      const run = state.tail.then(() => work())
      state.tail = run.catch(() => undefined)
      return run
    },
    encrypt: async (value) => `enc(${value})`,
    decrypt: async (value) => value.replace(/^enc\((.*)\)$/, '$1'),
    now: () => state.clock,
    ...overrides,
  }
  return { state, deps, gateway: createNexoraGateway(deps) }
}

describe('gateway access of a person', () => {
  it('is off, and asks nothing, without a gateway address', async () => {
    const { deps, gateway } = world({ gatewayUrl: () => null })
    await expect(gateway.resolve({ workspaceId: 'ws-alice' })).resolves.toBeNull()
    expect(deps.requestAccess).not.toHaveBeenCalled()
  })

  it('asks the site once on first use, keeps the key encrypted, and reuses it afterwards', async () => {
    const { state, deps, gateway } = world()
    const first = await gateway.resolve({ workspaceId: 'ws-alice' })
    expect(first).toEqual({
      baseUrl: GATEWAY,
      apiKey: KEY,
      model: 'nexora/deepseek-v4.1-flash-1017',
    })
    expect(state.rows.get(ALICE)?.keyEncrypted).toBe(`enc(${KEY})`)
    expect(JSON.stringify([...state.rows])).not.toContain(`"${KEY}"`)

    await expect(gateway.resolve({ workspaceId: 'ws-alice' })).resolves.toEqual(first)
    expect(deps.requestAccess).toHaveBeenCalledTimes(1)
    expect(state.siteCalls).toEqual([TOKEN])
  })

  it('makes a new key when the stored one can no longer be read', async () => {
    const { state, deps, gateway } = world({
      decrypt: async (value) => {
        if (value === 'garbage') throw new Error('bad ciphertext')
        return value.replace(/^enc\((.*)\)$/, '$1')
      },
    })
    state.rows.set(ALICE, { keyEncrypted: 'garbage', model: 'old' })
    await expect(gateway.resolve({ workspaceId: 'ws-alice' })).resolves.toMatchObject({
      apiKey: KEY,
    })
    expect(state.rows.get(ALICE)?.keyEncrypted).toBe(`enc(${KEY})`)
    expect(deps.requestAccess).toHaveBeenCalledTimes(1)
  })

  it('makes one key when two requests of a new person arrive together', async () => {
    const { deps, gateway } = world()
    const [a, b] = await Promise.all([
      gateway.resolve({ workspaceId: 'ws-alice' }),
      gateway.resolve({ workspaceId: 'ws-alice' }),
    ])
    expect(a?.apiKey).toBe(KEY)
    expect(b?.apiKey).toBe(KEY)
    expect(deps.requestAccess).toHaveBeenCalledTimes(1)
  })

  it('is paid by the person billed for the workspace, not by the one who runs it', async () => {
    const { state, gateway } = world()
    state.rows.set(ALICE, { keyEncrypted: 'enc(nxk_alice)', model: 'm-alice' })
    state.rows.set(BOB, { keyEncrypted: 'enc(nxk_bob)', model: 'm-bob' })
    const access = await gateway.resolve({ workspaceId: 'ws-alice', userId: BOB })
    expect(access?.apiKey).toBe('nxk_alice')
  })

  it('refuses a workspace it cannot attribute, and a call with no owner at all', async () => {
    const { gateway } = world()
    await expect(gateway.resolve({ workspaceId: 'ws-gone', userId: BOB })).rejects.toMatchObject({
      code: 'no-owner',
    })
    await expect(gateway.resolve({})).rejects.toMatchObject({ code: 'no-owner' })
  })

  it('uses the acting person when the call belongs to no workspace', async () => {
    const { state, gateway } = world()
    state.rows.set(BOB, { keyEncrypted: 'enc(nxk_bob)', model: 'm-bob' })
    await expect(gateway.resolve({ userId: BOB })).resolves.toMatchObject({ apiKey: 'nxk_bob' })
  })

  it('leaves an account without a sign-in through the site on the instance key', async () => {
    const { state, deps, gateway } = world()
    state.owners.set('ws-operator', 'user-operator')
    await expect(gateway.resolve({ workspaceId: 'ws-operator' })).resolves.toBeNull()
    expect(deps.requestAccess).not.toHaveBeenCalled()
    expect(state.rows.size).toBe(0)
  })

  it.each([
    ['an expired token', { accessToken: TOKEN, expiresAt: new Date('2026-10-29T09:59:40Z') }],
    ['a missing token', { accessToken: null, expiresAt: null }],
  ])('fails closed on %s, never falling back to the instance key', async (_name, link) => {
    const { state, deps, gateway } = world()
    state.links.set(ALICE, link)
    await expect(gateway.resolve({ workspaceId: 'ws-alice' })).rejects.toMatchObject({
      code: 'session-expired',
    })
    expect(deps.requestAccess).not.toHaveBeenCalled()
    expect(state.rows.size).toBe(0)
  })

  it.each(['site-refused', 'site-unavailable', 'bad-answer'] as const)(
    'fails closed when the site answers %s, and stores nothing',
    async (code) => {
      const { state, gateway } = world()
      state.siteFailure = new NexoraGatewayError(code)
      await expect(gateway.resolve({ workspaceId: 'ws-alice' })).rejects.toMatchObject({ code })
      expect(state.rows.size).toBe(0)
    }
  )

  it('tries again on the next call after a failure', async () => {
    const { state, gateway } = world()
    state.siteFailure = new NexoraGatewayError('site-unavailable')
    await expect(gateway.resolve({ workspaceId: 'ws-alice' })).rejects.toBeInstanceOf(
      NexoraGatewayError
    )
    state.siteFailure = null
    await expect(gateway.resolve({ workspaceId: 'ws-alice' })).resolves.toMatchObject({
      apiKey: KEY,
    })
  })

  it('never carries the key in the error it raises', async () => {
    const { state, gateway } = world()
    state.siteFailure = new NexoraGatewayError('site-refused')
    const error = await gateway.resolve({ workspaceId: 'ws-alice' }).catch((e: unknown) => e)
    expect(String((error as Error).message)).not.toContain(KEY)
    expect(String((error as Error).message)).not.toContain(TOKEN)
  })
})

describe('ensure the key after the first sign-in', () => {
  it('makes the key and never throws, whatever the site answers', async () => {
    const { state, gateway } = world()
    await expect(gateway.ensure(ALICE)).resolves.toBeUndefined()
    expect(state.rows.has(ALICE)).toBe(true)

    state.rows.clear()
    state.siteFailure = new NexoraGatewayError('site-unavailable')
    await expect(gateway.ensure(ALICE)).resolves.toBeUndefined()
    expect(state.rows.size).toBe(0)
  })
})

describe('routing a request through the gateway', () => {
  const request = { model: 'vllm/nexora-default', workspaceId: 'ws-alice', apiKey: 'instance-key' }

  it('swaps the address, the key and the default model, and keeps the rest', async () => {
    const { gateway } = world()
    const routed = await gateway.route({ ...request, temperature: 0.2 })
    expect(routed).toEqual({
      model: 'vllm/nexora/deepseek-v4.1-flash-1017',
      workspaceId: 'ws-alice',
      apiKey: KEY,
      azureEndpoint: GATEWAY,
      temperature: 0.2,
    })
  })

  it('leaves a model the person chose as it is', async () => {
    const { gateway } = world()
    const routed = await gateway.route({ ...request, model: 'vllm/nexora/kimi-k2' })
    expect(routed.model).toBe('vllm/nexora/kimi-k2')
  })

  it('never sends the key to an endpoint a block names itself', async () => {
    const { deps, gateway } = world()
    const own = { ...request, azureEndpoint: 'https://my-vllm.example' }
    await expect(gateway.route(own)).resolves.toBe(own)
    expect(deps.requestAccess).not.toHaveBeenCalled()
  })

  it('passes the request through untouched when the gateway is off or the account is the operator’s', async () => {
    const off = world({ gatewayUrl: () => null })
    await expect(off.gateway.route(request)).resolves.toBe(request)
    const operator = world()
    operator.state.owners.set('ws-alice', 'user-operator')
    await expect(operator.gateway.route(request)).resolves.toBe(request)
  })
})

describe('requestWorkstudioAccess', () => {
  const ok = (body: unknown, status = 200) =>
    vi.fn(async () => new Response(JSON.stringify(body), { status }))

  it('calls the site’s access route with the token, and ignores the address it answers', async () => {
    const fetchFn = ok({ url: 'https://elsewhere.test/v1', model: 'nexora/m', key: KEY })
    await expect(requestWorkstudioAccess(TOKEN, { gatewayUrl: GATEWAY, fetchFn })).resolves.toEqual(
      { key: KEY, model: 'nexora/m' }
    )
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://nexora.example/api/oauth/workstudio-access')
    expect(init.method).toBe('GET')
    expect(init.redirect).toBe('error')
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`)
  })

  it.each([
    [401, 'site-refused'],
    [403, 'site-refused'],
    [500, 'site-unavailable'],
    [404, 'site-unavailable'],
  ])('answers HTTP %i as %s', async (status, code) => {
    const fetchFn = ok({ error: 'no' }, status)
    await expect(
      requestWorkstudioAccess(TOKEN, { gatewayUrl: GATEWAY, fetchFn })
    ).rejects.toMatchObject({ code })
  })

  it('answers an unreachable site, or a redirect, as unavailable', async () => {
    const fetchFn = vi.fn(async () => {
      throw new TypeError('fetch failed')
    })
    await expect(
      requestWorkstudioAccess(TOKEN, { gatewayUrl: GATEWAY, fetchFn })
    ).rejects.toMatchObject({ code: 'site-unavailable' })
  })

  it.each([
    ['no key', { model: 'm' }],
    ['no model', { key: KEY }],
    ['a key with a space', { key: 'nxk_abc def_0123456789', model: 'm' }],
    ['a key with a line break', { key: `${KEY}\nX-Evil: 1`, model: 'm' }],
    ['a key far too long', { key: 'k'.repeat(600), model: 'm' }],
    ['a key that is not text', { key: 12345, model: 'm' }],
    ['an empty answer', null],
  ])('refuses an answer with %s', async (_name, body) => {
    const fetchFn = ok(body)
    await expect(
      requestWorkstudioAccess(TOKEN, { gatewayUrl: GATEWAY, fetchFn })
    ).rejects.toMatchObject({ code: 'bad-answer' })
  })

  it('refuses an answer that is not JSON', async () => {
    const fetchFn = vi.fn(async () => new Response('<html>', { status: 200 }))
    await expect(
      requestWorkstudioAccess(TOKEN, { gatewayUrl: GATEWAY, fetchFn })
    ).rejects.toMatchObject({ code: 'bad-answer' })
  })
})
