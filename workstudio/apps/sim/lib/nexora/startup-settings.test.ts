import { describe, expect, it, vi } from 'vitest'
import {
  InstanceSettingsUnavailableError,
  loadInstanceSettingsIntoEnv,
} from '@/lib/nexora/startup-settings'

const BASE_ENV = {
  DATABASE_URL: 'postgres://workstudio@postgres/workstudio',
  INSTANCE_ORG_NAME: 'PME',
  ENCRYPTION_KEY: '00'.repeat(32),
}

const STORED = { revision: 2, allowedDomains: ['pme.fr'] }

function connectionRefused() {
  return Object.assign(new Error('connect ECONNREFUSED 10.0.0.2:5432'), { code: 'ECONNREFUSED' })
}

describe('reading the instance settings before the server starts', () => {
  it('waits for a database that is still starting, then applies the stored policy', async () => {
    const env: Record<string, string | undefined> = { ...BASE_ENV }
    const read = vi
      .fn()
      .mockRejectedValueOnce(connectionRefused())
      .mockRejectedValueOnce(connectionRefused())
      .mockResolvedValueOnce({ found: true, settings: STORED })
    const sleep = vi.fn(async () => {})

    const result = await loadInstanceSettingsIntoEnv(env, { read, sleep })

    expect(result).toEqual({ applied: ['domains'], failed: [] })
    expect(env.ALLOWED_LOGIN_DOMAINS).toBe('pme.fr')
    expect(read).toHaveBeenCalledTimes(3)
  })

  it('refuses to start without the stored policy when the database never answers', async () => {
    const env: Record<string, string | undefined> = { ...BASE_ENV }
    const read = vi.fn().mockRejectedValue(connectionRefused())
    const sleep = vi.fn(async (_ms: number) => {})

    await expect(loadInstanceSettingsIntoEnv(env, { read, sleep })).rejects.toBeInstanceOf(
      InstanceSettingsUnavailableError
    )
    expect(read).toHaveBeenCalledTimes(5)
    const waited = sleep.mock.calls.reduce((total, [ms]) => total + Number(ms), 0)
    expect(waited).toBeGreaterThanOrEqual(30_000)
    expect(waited).toBeLessThanOrEqual(60_000)
    expect(env.ALLOWED_LOGIN_DOMAINS).toBeUndefined()
  })

  it('treats a read that hangs as a failed attempt instead of waiting forever', async () => {
    vi.useFakeTimers()
    try {
      const read = vi.fn(() => new Promise<never>(() => {}))
      const loading = loadInstanceSettingsIntoEnv({ ...BASE_ENV }, { read, sleep: async () => {} })
      const outcome = expect(loading).rejects.toBeInstanceOf(InstanceSettingsUnavailableError)
      await vi.advanceTimersByTimeAsync(5 * 20_000)
      await outcome
      expect(read).toHaveBeenCalledTimes(5)
    } finally {
      vi.useRealTimers()
    }
  })

  it('starts at once on a fresh install: reachable database, no instance organization yet', async () => {
    const read = vi.fn().mockResolvedValue({ found: false })
    const sleep = vi.fn(async () => {})

    await expect(loadInstanceSettingsIntoEnv({ ...BASE_ENV }, { read, sleep })).resolves.toBeNull()
    expect(read).toHaveBeenCalledTimes(1)
    expect(sleep).not.toHaveBeenCalled()
  })

  it('starts at once when the organization holds no settings', async () => {
    const read = vi.fn().mockResolvedValue({ found: true, settings: null })

    await expect(
      loadInstanceSettingsIntoEnv({ ...BASE_ENV }, { read, sleep: async () => {} })
    ).resolves.toBeNull()
  })

  it('starts without a group whose secret no longer decrypts, as before', async () => {
    const env: Record<string, string | undefined> = { ...BASE_ENV }
    const read = vi.fn().mockResolvedValue({
      found: true,
      settings: { ...STORED, smtp: { host: 'smtp.pme.fr', port: 587, password: 'not-encrypted' } },
    })

    const result = await loadInstanceSettingsIntoEnv(env, { read, sleep: async () => {} })

    expect(result).toEqual({ applied: ['domains'], failed: ['smtp'] })
    expect(env.SMTP_HOST).toBeUndefined()
  })
})
