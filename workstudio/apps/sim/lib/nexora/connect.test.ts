import { describe, expect, it, vi } from 'vitest'
import {
  applyWorkspaceConnectToken,
  ensureNexoraConnectServer,
  NEXORA_CONNECT_SERVER_NAME,
} from '@/lib/nexora/connect'

const workspace = { workspaceId: 'ws-1', userId: 'user-1' }
const config = { url: 'http://nexora-connect:3000/mcp', token: 'runtime-token' }

describe('ensureNexoraConnectServer', () => {
  it('does nothing when Nexora Connect is not configured', async () => {
    const create = vi.fn()
    await expect(ensureNexoraConnectServer(workspace, { config: null, create })).resolves.toBe(
      'skipped'
    )
    expect(create).not.toHaveBeenCalled()
  })

  it('registers Nexora Connect as a header-authenticated MCP server of the workspace', async () => {
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
    const refused = vi.fn().mockResolvedValue({ success: false, errorCode: 'validation_error' })
    await expect(ensureNexoraConnectServer(workspace, { config, create: refused })).resolves.toBe(
      'failed'
    )
  })
})

describe('workspace isolation in Nexora Connect', () => {
  it('registers a new workspace with its own limited token when Connect administration is set up', async () => {
    const create = vi.fn().mockResolvedValue({ success: true, serverId: 'srv-1' })
    const syncToken = vi.fn().mockResolvedValue({ token: 'oct_workspace' })
    await expect(ensureNexoraConnectServer(workspace, { config, create, syncToken })).resolves.toBe(
      'created'
    )
    expect(syncToken).toHaveBeenCalledWith('ws-1')
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ headers: { Authorization: 'Bearer oct_workspace' } })
    )
  })

  it('keeps the shared token when the workspace token cannot be made, rather than no tools at all', async () => {
    const create = vi.fn().mockResolvedValue({ success: true, serverId: 'srv-1' })
    const syncToken = vi.fn().mockRejectedValue(new Error('connect down'))
    await expect(ensureNexoraConnectServer(workspace, { config, create, syncToken })).resolves.toBe(
      'created'
    )
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ headers: { Authorization: 'Bearer runtime-token' } })
    )
  })

  it('puts a new workspace token on the existing server of that workspace', async () => {
    const create = vi.fn().mockResolvedValue({ success: true, serverId: 'srv-1', updated: true })
    await applyWorkspaceConnectToken(workspace, 'oct_new', { config, create })
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'ws-1',
        url: 'http://nexora-connect:3000/mcp',
        headers: { Authorization: 'Bearer oct_new' },
        existingServerBehavior: 'update',
      })
    )
  })
})
