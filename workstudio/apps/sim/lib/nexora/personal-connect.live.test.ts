/**
 * Personal connections against a running Nexora Connect (`K6_CONNECT_URL`, `K6_CONNECT_ADMIN_TOKEN`):
 * two members and a workspace each connect `postmark` with a made-up key (Connect stores it
 * without calling the provider), and each runtime token made by WorkStudio sees only what it
 * grants. Never run in CI.
 */
import { generateId } from '@sim/utils/id'
import { afterAll, describe, expect, it } from 'vitest'
import {
  connectPersonalWithCredentials,
  connectWithCredentials,
  disconnect,
  disconnectPersonal,
  personalConnectionName,
  revokePersonalToken,
  syncPersonalToken,
  workspaceConnectionName,
} from '@/lib/nexora/connect-admin'

const baseUrl = process.env.K6_CONNECT_URL ?? ''
const adminToken = process.env.K6_CONNECT_ADMIN_TOKEN ?? ''
const options = { config: { baseUrl, adminToken } }

const run = generateId().slice(0, 8)
const alice = `k6alice${run}`
const bob = `k6bob${run}`
const workspaceId = `k6ws${run}`
const issued: { alice?: { id: string; secret: string }; bob?: { id: string; secret: string } } = {}

async function runtime<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  // boundary-raw-fetch: Nexora Connect is a separate service, not a same-origin route
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  return (await response.json().catch(() => ({}))) as T
}

async function aliasesSeenBy(token: string): Promise<string[]> {
  const body = await runtime<{ data?: { alias: string }[] }>(token, '/v1/apps')
  return (body.data ?? []).map((entry) => entry.alias)
}

describe.skipIf(!baseUrl || !adminToken)('personal connections in Nexora Connect', () => {
  afterAll(async () => {
    for (const token of [issued.alice, issued.bob]) {
      if (token) await revokePersonalToken(token.id, options).catch(() => undefined)
    }
    await disconnectPersonal(alice, 'postmark', options).catch(() => undefined)
    await disconnectPersonal(bob, 'postmark', options).catch(() => undefined)
    await disconnect(workspaceId, 'postmark', options).catch(() => undefined)
  })

  it('gives each member a token that sees their own connection only', async () => {
    const key = () => ({ apiKey: `k6-${generateId()}` })
    await connectPersonalWithCredentials(alice, 'postmark', 'api_key', key(), options)
    await connectPersonalWithCredentials(bob, 'postmark', 'api_key', key(), options)
    await connectWithCredentials(workspaceId, 'postmark', 'api_key', key(), options)

    const forAlice = await syncPersonalToken({ userId: alice, workspaceId }, options)
    const forBob = await syncPersonalToken({ userId: bob, workspaceId }, options)
    expect(forAlice.token).toMatch(/^oct_/)
    expect(forBob.token).toMatch(/^oct_/)
    issued.alice = { id: forAlice.tokenId, secret: forAlice.token ?? '' }
    issued.bob = { id: forBob.tokenId, secret: forBob.token ?? '' }

    const seenByAlice = await aliasesSeenBy(issued.alice.secret)
    const seenByBob = await aliasesSeenBy(issued.bob.secret)
    expect(seenByAlice).toContain(personalConnectionName(alice))
    expect(seenByAlice).not.toContain(personalConnectionName(bob))
    expect(seenByAlice).not.toContain(workspaceConnectionName(workspaceId))
    expect(seenByBob).toContain(personalConnectionName(bob))
    expect(seenByBob).not.toContain(personalConnectionName(alice))
  })

  it('refuses a member’s token the other member’s connection, by name', async () => {
    const catalog = await fetch(`${baseUrl}/api/providers`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((response) => response.json() as Promise<{ service: string; actions?: { id: string }[] }[]>)
    const actionId = catalog.find((entry) => entry.service === 'postmark')?.actions?.[0]?.id
    expect(actionId).toBeTruthy()
    const secret = issued.alice?.secret ?? ''
    const call = (connectionName: string) =>
      runtime<{ errorCode?: string }>(secret, `/v1/actions/${actionId}`, {
        method: 'POST',
        body: JSON.stringify({ input: {}, connectionName }),
      })
    expect((await call(personalConnectionName(bob))).errorCode).toBe('connection_not_allowed')
    expect((await call(personalConnectionName(alice))).errorCode).not.toBe('connection_not_allowed')
  })

  it('keeps the same token when its grant changes, and then reaches the workspace’s connection', async () => {
    await disconnectPersonal(alice, 'postmark', options)
    const refreshed = await syncPersonalToken(
      { userId: alice, workspaceId, existingTokenId: issued.alice?.id },
      options
    )
    expect(refreshed.tokenId).toBe(issued.alice?.id)
    expect(refreshed.token).toBeUndefined()
    const seen = await aliasesSeenBy(issued.alice?.secret ?? '')
    expect(seen).toContain(workspaceConnectionName(workspaceId))
    expect(seen).not.toContain(personalConnectionName(alice))
  })
})
