import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  isRestartInProgress,
  isRestartSupervised,
  scheduleGracefulRestart,
} from '@/lib/nexora/restart'

describe('isRestartSupervised', () => {
  const noDockerEnv = () => false
  const dockerEnv = (path: string) => path === '/.dockerenv'

  it('refuses a production build that nothing would start again', () => {
    expect(isRestartSupervised({ NODE_ENV: 'production' }, noDockerEnv)).toBe(false)
  })

  it('accepts a production server inside a container', () => {
    expect(isRestartSupervised({ NODE_ENV: 'production' }, dockerEnv)).toBe(true)
    expect(
      isRestartSupervised({ NODE_ENV: 'production', NEXORA_SUPERVISED: '1' }, noDockerEnv)
    ).toBe(true)
  })

  it('refuses a development server even inside a container', () => {
    expect(
      isRestartSupervised({ NODE_ENV: 'development', NEXORA_SUPERVISED: '1' }, dockerEnv)
    ).toBe(false)
  })
})

describe('scheduleGracefulRestart', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('stops gracefully, forces the exit when the stop hangs, and refuses a second restart', () => {
    const kill = vi.spyOn(process, 'kill').mockImplementation(() => true)
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

    expect(isRestartInProgress()).toBe(false)
    expect(scheduleGracefulRestart()).toBe(true)
    expect(isRestartInProgress()).toBe(true)
    expect(scheduleGracefulRestart()).toBe(false)

    vi.advanceTimersByTime(1_000)
    expect(kill).toHaveBeenCalledExactlyOnceWith(process.pid, 'SIGTERM')
    expect(exit).not.toHaveBeenCalled()

    vi.advanceTimersByTime(14_999)
    expect(exit).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(exit).toHaveBeenCalledExactlyOnceWith(0)
  })
})
