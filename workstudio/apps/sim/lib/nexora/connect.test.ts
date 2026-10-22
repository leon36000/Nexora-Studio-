import { describe, expect, it, vi } from 'vitest'
import { ensureNexoraConnectServer, NEXORA_CONNECT_SERVER_NAME } from '@/lib/nexora/connect'

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
