import { describe, expect, it } from 'vitest'
import {
  createInteractiveGate,
  INTERACTIVE_ACTIVITY_WINDOW_MS,
  instanceLimiter,
} from '@/lib/nexora/background-load'

describe('createInteractiveGate', () => {
  it('stays idle when nobody is waiting on a run and nothing was noted', async () => {
    const gate = createInteractiveGate({
      now: () => 1_000,
      hasRunningInteractiveRun: async () => false,
    })
    expect(await gate.busy()).toBe(false)
  })

  it('is busy while a chat or manual run is in progress', async () => {
    const gate = createInteractiveGate({
      now: () => 1_000,
      hasRunningInteractiveRun: async () => true,
    })
    expect(await gate.busy()).toBe(true)
  })

  it('is busy for the activity window after an interactive model call, then idle again', async () => {
    let clock = 10_000
    const gate = createInteractiveGate({
      now: () => clock,
      hasRunningInteractiveRun: async () => false,
    })
    gate.note()
    clock += INTERACTIVE_ACTIVITY_WINDOW_MS - 1
    expect(await gate.busy()).toBe(true)
    clock += 2
    expect(await gate.busy()).toBe(false)
  })

  it('does not read the run log when an interactive call was just noted', async () => {
    let reads = 0
    const gate = createInteractiveGate({
      now: () => 5,
      hasRunningInteractiveRun: async () => {
        reads += 1
        return false
      },
    })
    gate.note()
    await gate.busy()
    expect(reads).toBe(0)
  })
})

describe('instanceLimiter', () => {
  it('is one limiter for the whole process, capped at four calls', async () => {
    const releases = await Promise.all([1, 2, 3, 4].map(() => instanceLimiter.acquire()))
    let fifthGranted = false
    const fifth = instanceLimiter.acquire().then((release) => {
      fifthGranted = true
      return release
    })
    await Promise.resolve()
    expect(fifthGranted).toBe(false)
    releases[0]()
    const release = await fifth
    expect(fifthGranted).toBe(true)
    release()
    for (const free of releases.slice(1)) free()
  })
})
