/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import '@/lib/core/zod-browser-config'

describe('zod in the browser', () => {
  it('skips the code-generation probe that a strict Content-Security-Policy reports as a violation', () => {
    expect(z.core.globalConfig.jitless).toBe(true)
  })
})
