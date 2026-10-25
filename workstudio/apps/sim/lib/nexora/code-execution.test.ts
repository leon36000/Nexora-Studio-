import { describe, expect, it } from 'vitest'
import {
  createCodeExecutionGate,
  mergeCodeExecution,
  parseCodeExecution,
} from '@/lib/nexora/code-execution'

describe('parseCodeExecution', () => {
  it('is disabled when nothing, or anything unexpected, is stored', () => {
    expect(parseCodeExecution(null)).toEqual({ enabled: false })
    expect(parseCodeExecution({})).toEqual({ enabled: false })
    expect(parseCodeExecution({ nexoraCodeExecution: 'oui' })).toEqual({ enabled: false })
    expect(parseCodeExecution({ nexoraCodeExecution: { enabled: 'true' } })).toEqual({
      enabled: false,
    })
  })

  it('reads an explicit switch', () => {
    expect(
      parseCodeExecution({
        nexoraCodeExecution: { enabled: true, updatedAt: '2026-10-24T08:00:00.000Z' },
      })
    ).toEqual({ enabled: true, updatedAt: '2026-10-24T08:00:00.000Z' })
  })
})

describe('mergeCodeExecution', () => {
  it('keeps every other metadata key', () => {
    const merged = mergeCodeExecution(
      { nexoraBudgets: { a: 1 }, nexoraSettings: { revision: 3 } },
      true,
      '2026-10-24T08:00:00.000Z'
    )
    expect(merged.nexoraBudgets).toEqual({ a: 1 })
    expect(merged.nexoraSettings).toEqual({ revision: 3 })
    expect(parseCodeExecution(merged)).toEqual({
      enabled: true,
      updatedAt: '2026-10-24T08:00:00.000Z',
    })
  })
})

describe('createCodeExecutionGate', () => {
  function gate(options: {
    configured: boolean
    stored: () => Promise<boolean>
    now?: () => number
  }) {
    return createCodeExecutionGate({
      isConfigured: () => options.configured,
      readEnabled: options.stored,
      ttlMs: 15_000,
      now: options.now,
    })
  }

  it('is closed without the sandbox service, whatever an administrator set', async () => {
    let reads = 0
    const closed = gate({
      configured: false,
      stored: async () => {
        reads++
        return true
      },
    })
    expect(await closed.isEnabled()).toBe(false)
    expect(reads).toBe(0)
  })

  it('is closed when the setting cannot be read', async () => {
    const broken = gate({
      configured: true,
      stored: async () => {
        throw new Error('base indisponible')
      },
    })
    expect(await broken.isEnabled()).toBe(false)
  })

  it('serves the setting from memory for a few seconds, then reads it again', async () => {
    let now = 1_000
    let reads = 0
    let stored = true
    const g = gate({
      configured: true,
      now: () => now,
      stored: async () => {
        reads++
        return stored
      },
    })
    expect(await g.isEnabled()).toBe(true)
    stored = false
    now += 10_000
    expect(await g.isEnabled()).toBe(true)
    expect(reads).toBe(1)
    now += 6_000
    expect(await g.isEnabled()).toBe(false)
    expect(reads).toBe(2)
  })

  it('forgets the cached answer after an update in this process', async () => {
    let stored = false
    const g = gate({ configured: true, stored: async () => stored })
    expect(await g.isEnabled()).toBe(false)
    stored = true
    g.invalidate()
    expect(await g.isEnabled()).toBe(true)
  })
})
