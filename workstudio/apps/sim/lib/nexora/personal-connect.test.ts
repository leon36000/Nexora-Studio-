import { describe, expect, it, vi } from 'vitest'
import { generateMcpServerId } from '@/lib/mcp/utils'
import {
  createPersonalConnectResolver,
  isNexoraConnectServer,
  PersonalConnectUnavailableError,
  type PersonalConnectDependencies,
} from '@/lib/nexora/personal-connect'
import { ConnectUnavailableError } from '@/lib/nexora/connect-admin'

const WS = 'workspace-1'
const ALICE = 'user-alice'

interface Row {
  connectTokenId: string
  tokenEncrypted: string
  grantHash: string
}

/** The member's token row, Nexora Connect and the clock, in memory. */
function world() {
  const state = {
    personal: [{ id: 'c-1', service: 'gmail', authType: 'oauth2' }],
    row: null as Row | null,
    down: false,
    grant: 'grant-1',
    issued: 0,
    syncs: 0,
    clock: 1_000,
    exposed: [] as string[],
  }
  const deps: PersonalConnectDependencies = {
    isConfigured: () => true,
    listPersonal: vi.fn(async () => {
      if (state.down) throw new ConnectUnavailableError('down')
      return state.personal
    }),
    sync: vi.fn(async (input) => {
      state.syncs++
      if (state.down) throw new ConnectUnavailableError('down')
      if (input.existingTokenId && state.row?.connectTokenId === input.existingTokenId) {
        return { tokenId: input.existingTokenId, grantHash: state.grant }
      }
      state.issued++
      return { tokenId: `tok-${state.issued}`, token: `oct_secret_${state.issued}`, grantHash: state.grant }
    }),
    readRow: vi.fn(async () => state.row),
    writeRow: vi.fn(async (_member, row) => {
      state.row = row
    }),
    withLock: (_key, work) => work(),
    encrypt: async (value) => `enc(${value})`,
    decrypt: async (value) => value.replace(/^enc\((.*)\)$/, '$1'),
    now: () => state.clock,
  }
  return { state, deps }
}

describe('resolvePersonalConnectHeaders', () => {
  it('answers null for a member without personal connection, so the workspace token stays in use', async () => {
    const { state, deps } = world()
    state.personal = []
    const resolver = createPersonalConnectResolver(deps)
    await expect(resolver.resolve({ workspaceId: WS, userId: ALICE })).resolves.toBeNull()
    expect(deps.sync).not.toHaveBeenCalled()
  })

  it('creates the member’s token on first use, stores it encrypted and returns it as a bearer header', async () => {
    const { state, deps } = world()
    const resolver = createPersonalConnectResolver(deps)
    await expect(resolver.resolve({ workspaceId: WS, userId: ALICE })).resolves.toEqual({
      Authorization: 'Bearer oct_secret_1',
    })
    expect(state.row?.tokenEncrypted).toBe('enc(oct_secret_1)')
    expect(state.row?.tokenEncrypted).not.toContain('Bearer')
  })

  it('does not ask Connect again within the freshness window, and checks the grant after it', async () => {
    const { state, deps } = world()
    const resolver = createPersonalConnectResolver(deps)
    await resolver.resolve({ workspaceId: WS, userId: ALICE })
    state.clock += 10_000
    await expect(resolver.resolve({ workspaceId: WS, userId: ALICE })).resolves.toEqual({
      Authorization: 'Bearer oct_secret_1',
    })
    expect(state.syncs).toBe(1)

    state.clock += 60_000
    state.grant = 'grant-2'
    await expect(resolver.resolve({ workspaceId: WS, userId: ALICE })).resolves.toEqual({
      Authorization: 'Bearer oct_secret_1',
    })
    expect(state.syncs).toBe(2)
    expect(state.row?.grantHash).toBe('grant-2')
    expect(state.issued).toBe(1)
  })

  it('forgets the freshness when a connection changes', async () => {
    const { state, deps } = world()
    const resolver = createPersonalConnectResolver(deps)
    await resolver.resolve({ workspaceId: WS, userId: ALICE })
    resolver.forget(ALICE)
    await resolver.resolve({ workspaceId: WS, userId: ALICE })
    expect(state.syncs).toBe(2)
  })

  it('fails closed when Connect is unreachable for a member who has a token: never the workspace token', async () => {
    const { state, deps } = world()
    const resolver = createPersonalConnectResolver(deps)
    await resolver.resolve({ workspaceId: WS, userId: ALICE })
    resolver.forget(ALICE)
    state.down = true
    await expect(resolver.resolve({ workspaceId: WS, userId: ALICE })).rejects.toBeInstanceOf(
      PersonalConnectUnavailableError
    )
  })

  it('keeps the token out of every error message', async () => {
    const { state, deps } = world()
    const resolver = createPersonalConnectResolver(deps)
    await resolver.resolve({ workspaceId: WS, userId: ALICE })
    resolver.forget(ALICE)
    state.down = true
    const message = await resolver.resolve({ workspaceId: WS, userId: ALICE }).then(
      () => '',
      (error: Error) => error.message
    )
    expect(message).not.toContain('oct_secret')
    expect(message).not.toContain('Bearer')
  })

  it('answers null when administration is not configured', async () => {
    const { deps } = world()
    const resolver = createPersonalConnectResolver({ ...deps, isConfigured: () => false })
    await expect(resolver.resolve({ workspaceId: WS, userId: ALICE })).resolves.toBeNull()
  })
})

describe('isNexoraConnectServer', () => {
  const url = 'http://nexora-connect:3000/mcp'

  it('recognizes the workspace’s own Nexora Connect server and nothing else', () => {
    expect(isNexoraConnectServer(generateMcpServerId(WS, url), WS, url)).toBe(true)
    expect(isNexoraConnectServer(generateMcpServerId(WS, 'https://other.example/mcp'), WS, url)).toBe(
      false
    )
    expect(isNexoraConnectServer(generateMcpServerId('workspace-2', url), WS, url)).toBe(false)
  })

  it('recognizes nothing when Connect is not configured', () => {
    expect(isNexoraConnectServer(generateMcpServerId(WS, url), WS, '')).toBe(false)
  })
})
