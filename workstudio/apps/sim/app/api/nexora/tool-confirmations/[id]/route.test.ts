import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = vi.hoisted(() => ({ decide: vi.fn() }))
vi.mock('@/lib/nexora/tool-confirmation/store', () => ({ decideConfirmation: store.decide }))

import { POST } from '@/app/api/nexora/tool-confirmations/[id]/route'

const TOKEN = 'a'.repeat(40)
const call = (body: unknown) =>
  POST(
    new NextRequest('http://localhost/api/nexora/tool-confirmations/req-12345678', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: 'req-12345678' }) }
  )

describe('POST /api/nexora/tool-confirmations/[id]', () => {
  beforeEach(() => {
    store.decide.mockReset()
  })

  it('records an answer given with the right token', async () => {
    store.decide.mockResolvedValue('decided')
    const response = await call({ token: TOKEN, decision: 'deny' })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ decision: 'deny' })
    expect(store.decide).toHaveBeenCalledWith('req-12345678', TOKEN, 'deny')
  })

  it('refuses a wrong token (403), a second answer and an expired request (409), each with its own code', async () => {
    store.decide.mockResolvedValueOnce('forbidden')
    expect((await call({ token: TOKEN, decision: 'allow' })).status).toBe(403)
    store.decide.mockResolvedValueOnce('already_decided')
    const second = await call({ token: TOKEN, decision: 'allow' })
    expect(second.status).toBe(409)
    expect(await second.json()).toEqual({ error: 'already-decided' })
    store.decide.mockResolvedValueOnce('expired')
    const late = await call({ token: TOKEN, decision: 'allow' })
    expect(late.status).toBe(409)
    expect(await late.json()).toEqual({ error: 'expired' })
  })

  it('rejects a body that is not a token and an allow/deny decision, without touching the store', async () => {
    expect((await call({ token: 'court', decision: 'allow' })).status).toBe(400)
    expect((await call({ token: TOKEN, decision: 'peut-être' })).status).toBe(400)
    expect(store.decide).not.toHaveBeenCalled()
  })
})
