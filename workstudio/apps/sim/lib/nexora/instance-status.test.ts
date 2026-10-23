import { describe, expect, it, vi } from 'vitest'
import {
  freeGigabytes,
  httpProbe,
  type InstanceStatusSources,
  readInstanceStatus,
  serviceProbeUrl,
} from '@/lib/nexora/instance-status'

const up = () => Promise.resolve()

function sources(overrides: Partial<InstanceStatusSources> = {}): InstanceStatusSources {
  return {
    version: '2.4.0',
    probes: {
      postgres: up,
      redis: up,
      'nexora-api': up,
      'nexora-connect': up,
      realtime: up,
      ollama: up,
      searxng: null,
      whisper: null,
    },
    readDiskFreeBytes: () => Promise.resolve(42_700_000_000),
    ...overrides,
  }
}

describe('serviceProbeUrl', () => {
  it('probes the service origin, without its path or credentials', () => {
    expect(serviceProbeUrl('http://user:secret@nexora-api:8000/v1', '/health')).toBe(
      'http://nexora-api:8000/health'
    )
  })

  it('treats a missing, blank or malformed address as not configured', () => {
    expect(serviceProbeUrl(undefined, '/health')).toBeNull()
    expect(serviceProbeUrl('  ', '/health')).toBeNull()
    expect(serviceProbeUrl('not a url', '/health')).toBeNull()
  })
})

describe('freeGigabytes', () => {
  it('rounds down to whole gigabytes, like nexora status', () => {
    expect(freeGigabytes(42_999_999_999)).toBe(42)
    expect(freeGigabytes(999_999_999)).toBe(0)
  })
})

describe('httpProbe', () => {
  it('is not configured without an address', () => {
    expect(httpProbe(null, vi.fn())).toBeNull()
  })

  it('fails on a non-success answer', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('busy', { status: 503 }))
    const probe = httpProbe('http://nexora-api:8000/health', fetchFn)
    await expect(probe?.(new AbortController().signal)).rejects.toThrow()
  })

  it('succeeds on a success answer and forwards the deadline signal', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    const signal = new AbortController().signal
    await expect(httpProbe('http://ollama:11434/api/version', fetchFn)?.(signal)).resolves.toBe(
      undefined
    )
    expect(fetchFn).toHaveBeenCalledWith('http://ollama:11434/api/version', { signal })
  })
})

describe('readInstanceStatus', () => {
  it('reports every service, the version and the free disk space', async () => {
    const status = await readInstanceStatus(sources())
    expect(status.version).toBe('2.4.0')
    expect(status.diskFreeGb).toBe(42)
    expect(status.services).toEqual([
      { id: 'postgres', state: 'up' },
      { id: 'redis', state: 'up' },
      { id: 'nexora-api', state: 'up' },
      { id: 'nexora-connect', state: 'up' },
      { id: 'realtime', state: 'up' },
      { id: 'ollama', state: 'up' },
      { id: 'searxng', state: 'not-configured' },
      { id: 'whisper', state: 'not-configured' },
    ])
  })

  it('reports a failing service as down without failing the others', async () => {
    const status = await readInstanceStatus(
      sources({
        probes: {
          ...sources().probes,
          postgres: () => Promise.reject(new Error('connection refused')),
          'nexora-api': () => Promise.reject(new Error('503')),
        },
      })
    )
    const states = Object.fromEntries(status.services.map((s) => [s.id, s.state]))
    expect(states.postgres).toBe('down')
    expect(states['nexora-api']).toBe('down')
    expect(states.redis).toBe('up')
  })

  it('reports a service that does not answer in time as down', async () => {
    vi.useFakeTimers()
    try {
      let aborted = false
      const pending = readInstanceStatus(
        sources({
          probes: {
            ...sources().probes,
            ollama: (signal) =>
              new Promise<void>(() => {
                signal.addEventListener('abort', () => {
                  aborted = true
                })
              }),
          },
        })
      )
      await vi.advanceTimersByTimeAsync(5_000)
      const status = await pending
      expect(status.services.find((s) => s.id === 'ollama')?.state).toBe('down')
      expect(aborted).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('leaves the version and the disk space empty when they cannot be read', async () => {
    const status = await readInstanceStatus(
      sources({ version: '  ', readDiskFreeBytes: () => Promise.reject(new Error('ENOENT')) })
    )
    expect(status.version).toBeNull()
    expect(status.diskFreeGb).toBeNull()
  })
})
