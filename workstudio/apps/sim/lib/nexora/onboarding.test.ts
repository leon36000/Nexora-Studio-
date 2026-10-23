import { describe, expect, it } from 'vitest'
import { mergeOnboarding, parseOnboarding } from '@/lib/nexora/onboarding'

describe('parseOnboarding', () => {
  it('starts empty when the organization has no metadata or garbage', () => {
    for (const metadata of [null, undefined, 'x', [], { nexoraOnboarding: 'oops' }]) {
      expect(parseOnboarding(metadata)).toEqual({ completed: [], dismissed: false })
    }
  })

  it('keeps only known steps, once each', () => {
    expect(
      parseOnboarding({
        nexoraOnboarding: { completed: ['model', 'hack', 'model'], dismissed: true },
      })
    ).toEqual({ completed: ['model'], dismissed: true })
  })
})

describe('mergeOnboarding', () => {
  it('records a step without touching the other metadata keys', () => {
    const merged = mergeOnboarding({ other: { keep: 1 } }, { complete: 'team' })
    expect(merged).toEqual({
      other: { keep: 1 },
      nexoraOnboarding: { completed: ['team'], dismissed: false },
    })
  })

  it('ends the first launch once the first run succeeded', () => {
    const merged = mergeOnboarding(
      { nexoraOnboarding: { completed: ['organization'], dismissed: false } },
      { complete: 'first-run' }
    )
    expect(merged.nexoraOnboarding).toEqual({
      completed: ['organization', 'first-run'],
      dismissed: true,
    })
  })

  it('can hide the panel and bring it back', () => {
    const hidden = mergeOnboarding(null, { dismissed: true })
    expect(parseOnboarding(hidden).dismissed).toBe(true)
    expect(parseOnboarding(mergeOnboarding(hidden, { dismissed: false })).dismissed).toBe(false)
  })
})
