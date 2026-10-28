import { beforeEach, describe, expect, it, vi } from 'vitest'

const { events } = vi.hoisted(() => ({ events: [] as string[] }))

vi.mock('@sim/db', () => ({
  db: {
    transaction: vi.fn(async (callback: (tx: object) => Promise<unknown>) => {
      events.push('transaction:start')
      try {
        return await callback({})
      } finally {
        events.push('transaction:end')
      }
    }),
  },
  // The real helper runs `fn` outside the transaction's ambient context.
  runOutsideTransactionContext: vi.fn(<T>(fn: () => T): T => {
    events.push('outside:start')
    try {
      return fn()
    } finally {
      events.push('outside:end')
    }
  }),
}))

vi.mock('@/lib/db/advisory-locks', () => ({
  acquireAdvisoryXactLock: vi.fn(async () => {
    events.push('lock')
  }),
  withLockTimeout: vi.fn(async (_tx: object, _ms: number, fn: () => Promise<void>) => fn()),
}))

import { lockWorkspaceToken } from '@/lib/nexora/connect'

describe('lockWorkspaceToken', () => {
  beforeEach(() => {
    events.length = 0
  })

  it('holds the advisory lock while the work runs on the shared pool, outside the lock transaction', async () => {
    const result = await lockWorkspaceToken('ws-1', async () => {
      events.push('work')
      return 'done'
    })

    expect(result).toBe('done')
    // The work uses the global pool on purpose (the lock transaction only holds the lock): it is declared
    // so, instead of tripping the pool's « query inside a transaction callback » error on every workspace creation.
    expect(events).toEqual([
      'transaction:start',
      'lock',
      'outside:start',
      'work',
      'outside:end',
      'transaction:end',
    ])
  })

  it('releases the lock when the work fails', async () => {
    await expect(
      lockWorkspaceToken('ws-1', async () => {
        throw new Error('connect down')
      })
    ).rejects.toThrow('connect down')
    expect(events.at(-1)).toBe('transaction:end')
  })
})
