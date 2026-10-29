import { describe, expect, it } from 'vitest'
import {
  readWelcomeDismissed,
  writeWelcomeDismissed,
} from '@/app/workspace/[workspaceId]/home/nexora-home/welcome-state'

function memoryStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  const items = new Map<string, string>()
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
  }
}

const brokenStorage: Pick<Storage, 'getItem' | 'setItem'> = {
  getItem: () => {
    throw new Error('blocked')
  },
  setItem: () => {
    throw new Error('blocked')
  },
}

describe('welcome panel memory', () => {
  it('shows the panel to a person who never closed it', () => {
    expect(readWelcomeDismissed('user-1', memoryStorage())).toBe(false)
  })

  it('keeps it closed once closed, for that person only', () => {
    const storage = memoryStorage()
    writeWelcomeDismissed('user-1', storage)
    expect(readWelcomeDismissed('user-1', storage)).toBe(true)
    expect(readWelcomeDismissed('user-2', storage)).toBe(false)
  })

  it('still works when the browser refuses its storage (private window): the panel just comes back', () => {
    expect(readWelcomeDismissed('user-1', brokenStorage)).toBe(false)
    expect(() => writeWelcomeDismissed('user-1', brokenStorage)).not.toThrow()
  })

  it('works without any storage at all', () => {
    expect(readWelcomeDismissed('user-1', null)).toBe(false)
    expect(() => writeWelcomeDismissed('user-1', null)).not.toThrow()
  })
})
