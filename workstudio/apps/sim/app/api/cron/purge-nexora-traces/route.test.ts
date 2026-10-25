/**
 * @vitest-environment node
 */
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockVerify, mockRun, mockSettings } = vi.hoisted(() => ({
  mockVerify: vi.fn(),
  mockRun: vi.fn(),
  mockSettings: vi.fn(),
}))

vi.mock('@/lib/auth/internal', () => ({ verifyCronAuth: mockVerify }))
vi.mock('@/lib/nexora/traces/purge', () => ({ runScheduledPurge: mockRun }))
vi.mock('@/lib/nexora/traces/settings', () => ({ loadTraceSettings: mockSettings }))

import { GET } from '@/app/api/cron/purge-nexora-traces/route'

const request = () => new NextRequest('http://localhost/api/cron/purge-nexora-traces')

describe('GET /api/cron/purge-nexora-traces', () => {
  beforeEach(() => {
    mockVerify.mockReturnValue(null)
    mockSettings.mockResolvedValue({ retentionDays: 30 })
    mockRun.mockResolvedValue({ deletedTraces: 3, deletedConversations: 0, retentionDays: 30 })
  })

  it('refuses a call without the cron secret and purges nothing', async () => {
    mockVerify.mockReturnValue(new Response('Unauthorized', { status: 401 }))
    const response = await GET(request(), {})
    expect(response.status).toBe(401)
    expect(mockRun).not.toHaveBeenCalled()
  })

  it('applies the retention with the settings in force', async () => {
    const response = await GET(request(), {})
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: true, deletedTraces: 3, retentionDays: 30 })
    expect(mockRun).toHaveBeenCalledWith(expect.any(Date), { retentionDays: 30 })
  })

  it('answers 500 and keeps the error when the purge fails', async () => {
    mockRun.mockRejectedValue(new Error('base indisponible'))
    expect((await GET(request(), {})).status).toBe(500)
  })
})
