/**
 * @vitest-environment node
 */
import { authInternalMock, authInternalMockFns } from '@sim/testing/mocks/auth-internal.mock'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockTick, mockTickBatches } = vi.hoisted(() => ({
  mockTick: vi.fn(),
  mockTickBatches: vi.fn(),
}))

vi.mock('@/lib/auth/internal', () => authInternalMock)
vi.mock('@/lib/nexora/evaluations/live', () => ({ tickEvaluations: mockTick }))
vi.mock('@/lib/nexora/batches/live', () => ({ tickBatches: mockTickBatches }))

import { GET } from '@/app/api/cron/run-nexora-evaluations/route'

const { mockVerifyCronAuth } = authInternalMockFns

const request = (query = '') =>
  new NextRequest(`http://localhost/api/cron/run-nexora-evaluations${query}`)

describe('GET /api/cron/run-nexora-evaluations', () => {
  beforeEach(() => {
    mockVerifyCronAuth.mockReturnValue(null)
    mockTick.mockResolvedValue({ started: ['camp-1'], failed: [], resumed: [] })
    mockTickBatches.mockResolvedValue({ resumed: [], purged: { batches: 0, files: 0 } })
  })

  it('refuses a call without the cron secret and starts nothing', async () => {
    mockVerifyCronAuth.mockReturnValue(new Response('Unauthorized', { status: 401 }))
    const response = await GET(request(), {})
    expect(response.status).toBe(401)
    expect(mockTick).not.toHaveBeenCalled()
  })

  it('ticks with the real clock and reports what started', async () => {
    const response = await GET(request(), {})
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: true, started: ['camp-1'] })
    expect(mockTick).toHaveBeenCalledWith(expect.any(Date))
  })

  it('adopts the batches nobody runs and reports them next to the evaluations', async () => {
    mockTickBatches.mockResolvedValue({ resumed: ['batch_1'], purged: { batches: 2, files: 3 } })
    const body = await (await GET(request(), {})).json()
    expect(body).toMatchObject({
      success: true,
      started: ['camp-1'],
      batches: { resumed: ['batch_1'], purged: { batches: 2, files: 3 } },
    })
    expect(mockTickBatches).toHaveBeenCalledWith(expect.any(Date))
  })

  it('still ticks the evaluations when the batch tick fails, and says so', async () => {
    mockTickBatches.mockRejectedValue(new Error('base indisponible'))
    const response = await GET(request(), {})
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      started: ['camp-1'],
      batches: { error: expect.any(String) },
    })
  })

  it('plays the clock of another moment for a night test, with the secret', async () => {
    await GET(request('?asOf=2026-11-02T02:00:30Z'), {})
    expect(mockTick).toHaveBeenCalledWith(new Date('2026-11-02T02:00:30Z'))
  })

  it('refuses an unreadable date', async () => {
    expect((await GET(request('?asOf=demain'), {})).status).toBe(400)
    expect(mockTick).not.toHaveBeenCalled()
  })

  it('answers 500 when the tick fails', async () => {
    mockTick.mockRejectedValue(new Error('base indisponible'))
    expect((await GET(request(), {})).status).toBe(500)
  })
})
