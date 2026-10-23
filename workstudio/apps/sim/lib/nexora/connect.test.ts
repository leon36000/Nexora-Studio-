import { setEnv } from '@sim/testing/mocks/env.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ensureNexoraConnectServer,
  type IsolationDependencies,
  NEXORA_CONNECT_SERVER_NAME,
  reconcileWorkspaceConnect,
} from '@/lib/nexora/connect'
import { CONNECT_TOKEN_PENDING } from '@/lib/nexora/connect-headers'

const workspace = { workspaceId: 'ws-1', userId: 'user-1' }
const config = { url: 'http://nexora-connect:3000/mcp', token: 'runtime-token' }

/** One workspace's « Nexora Connect » server and its token in Connect, in memory. */
function isolationWorld(initialHeaders?: Record<string, string>) {
  let issued = 0
  const world = {
    server: initialHeaders ? { id: 'srv-1', headers: initialHeaders } : null,
    connectTokens: [] as string[],
    writeFails: false,
  }
  const deps: IsolationDependencies = {
    lock: (_workspaceId, work) => work(),
    findServer: vi.fn(async () => world.server),
    syncToken: vi.fn(async (_workspaceId: string, options: { recreate?: boolean }) => {
      if (options.recreate || world.connectTokens.length === 0) {
        const token = `oct_${++issued}`
        world.connectTokens = [token]
        return { token, connections: [] }
      }
      return { connections: [] }
    }),
    revokeToken: vi.fn(async () => {
      world.connectTokens = []
    }),
    writeServer: vi.fn(async ({ token }: { token: string }) => {
      if (world.writeFails) throw new Error('database unavailable')
      world.server = {
        id: 'srv-1',
        headers: { ...(world.server?.headers ?? {}), Authorization: `Bearer ${token}` },
      }
    }),
  }
  return { world, deps }
}

describe('ensureNexoraConnectServer', () => {
  beforeEach(() => {
    setEnv({ NEXORA_CONNECT_MCP_URL: config.url, NEXORA_CONNECT_TOKEN: config.token })
  })

  it('does nothing when Nexora Connect is not configured', async () => {
    const create = vi.fn()
    await expect(ensureNexoraConnectServer(workspace, { config: null, create })).resolves.toBe(
      'skipped'
    )
    expect(create).not.toHaveBeenCalled()
  })

  it('without Connect administration, registers the server with the deployment token', async () => {
    const create = vi.fn().mockResolvedValue({ success: true, serverId: 'srv-1' })
    await expect(ensureNexoraConnectServer(workspace, { config, create })).resolves.toBe('created')
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'ws-1',
        userId: 'user-1',
        name: NEXORA_CONNECT_SERVER_NAME,
        url: 'http://nexora-connect:3000/mcp',
        transport: 'streamable-http',
        authType: 'headers',
        headers: { Authorization: 'Bearer runtime-token' },
        existingServerBehavior: 'reject',
        writesNexoraConnectToken: true,
      })
    )
  })

  it('treats an already registered server as done (idempotent)', async () => {
    const create = vi.fn().mockResolvedValue({ success: false, errorCode: 'conflict' })
    await expect(ensureNexoraConnectServer(workspace, { config, create })).resolves.toBe('exists')
  })

  it('never throws: a failure is reported, workspace creation goes on', async () => {
    const create = vi.fn().mockRejectedValue(new Error('connect unreachable'))
    await expect(ensureNexoraConnectServer(workspace, { config, create })).resolves.toBe('failed')
  })

  it('registers a new workspace with its own limited token when Connect administration is set up', async () => {
    const { world, deps } = isolationWorld()
    const create = vi.fn()
    await expect(
      ensureNexoraConnectServer(workspace, { config, create, isolation: deps })
    ).resolves.toBe('created')
    expect(world.server?.headers).toEqual({ Authorization: 'Bearer oct_1' })
    expect(create).not.toHaveBeenCalled()
  })

  it('never falls back to the shared token when the workspace token cannot be made', async () => {
    const { deps } = isolationWorld()
    vi.mocked(deps.syncToken).mockRejectedValue(new Error('connect down'))
    const create = vi.fn().mockResolvedValue({ success: true, serverId: 'srv-1' })
    await expect(
      ensureNexoraConnectServer(workspace, { config, create, isolation: deps })
    ).resolves.toBe('pending')
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { Authorization: `Bearer ${CONNECT_TOKEN_PENDING}` },
        existingServerBehavior: 'reject',
        writesNexoraConnectToken: true,
      })
    )
    expect(JSON.stringify(create.mock.calls)).not.toContain('runtime-token')
  })
})

describe('reconcileWorkspaceConnect', () => {
  beforeEach(() => {
    setEnv({ NEXORA_CONNECT_MCP_URL: config.url, NEXORA_CONNECT_TOKEN: config.token })
  })

  it('gives a workspace still holding the shared token its own token, keeping its other headers', async () => {
    const { world, deps } = isolationWorld({
      Authorization: 'Bearer runtime-token',
      'X-Trace': 'on',
    })
    await reconcileWorkspaceConnect(workspace, deps)
    expect(deps.syncToken).toHaveBeenCalledWith('ws-1', { recreate: true })
    expect(world.server?.headers).toEqual({ Authorization: 'Bearer oct_1', 'X-Trace': 'on' })
  })

  it('repairs a workspace registered with the pending placeholder', async () => {
    const { world, deps } = isolationWorld({ Authorization: `Bearer ${CONNECT_TOKEN_PENDING}` })
    await reconcileWorkspaceConnect(workspace, deps)
    expect(world.server?.headers).toEqual({ Authorization: 'Bearer oct_1' })
  })

  it('puts the server back, with a fresh token, when it was removed', async () => {
    const { world, deps } = isolationWorld()
    world.connectTokens = ['oct_old']
    await reconcileWorkspaceConnect(workspace, deps)
    expect(deps.syncToken).toHaveBeenCalledWith('ws-1', { recreate: true })
    expect(world.server?.headers).toEqual({ Authorization: 'Bearer oct_1' })
  })

  it('only reconciles the grant of a workspace that already holds its own token', async () => {
    const { world, deps } = isolationWorld({ Authorization: 'Bearer oct_mine' })
    world.connectTokens = ['oct_mine']
    await reconcileWorkspaceConnect(workspace, deps)
    expect(deps.syncToken).toHaveBeenCalledWith('ws-1', { recreate: false })
    expect(deps.writeServer).not.toHaveBeenCalled()
  })

  it('recreates the token when Connect lost it, and installs the new one', async () => {
    const { world, deps } = isolationWorld({ Authorization: 'Bearer oct_revoked' })
    await reconcileWorkspaceConnect(workspace, deps)
    expect(world.server?.headers).toEqual({ Authorization: 'Bearer oct_1' })
  })

  it('treats a failed server update as a failure and revokes the token it could not install', async () => {
    const { world, deps } = isolationWorld({ Authorization: 'Bearer runtime-token' })
    world.writeFails = true
    await expect(reconcileWorkspaceConnect(workspace, deps)).rejects.toThrow('database unavailable')
    expect(world.connectTokens).toEqual([])
    expect(world.server?.headers).toEqual({ Authorization: 'Bearer runtime-token' })

    world.writeFails = false
    await reconcileWorkspaceConnect(workspace, deps)
    expect(world.server?.headers).toEqual({ Authorization: 'Bearer oct_2' })
  })
})
