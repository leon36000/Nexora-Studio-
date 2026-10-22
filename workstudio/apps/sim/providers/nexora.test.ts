import { describe, expect, it } from 'vitest'
import {
  effectiveBlacklistedProviders,
  NEXORA_MODEL_PROVIDER,
  pickNexoraDefaultModel,
} from '@/providers/nexora'

const ALL = ['openai', 'anthropic', 'vllm', 'ollama', 'mistral']

describe('effectiveBlacklistedProviders', () => {
  it('keeps the configured blacklist when Nexora-only models are off', () => {
    expect(effectiveBlacklistedProviders(ALL, ['openai'], false)).toEqual(['openai'])
  })

  it('hides every provider except Nexora API when Nexora-only models are on', () => {
    expect(effectiveBlacklistedProviders(ALL, [], true)).toEqual([
      'openai',
      'anthropic',
      'ollama',
      'mistral',
    ])
  })

  it('never hides Nexora API itself, even if listed in the blacklist', () => {
    expect(effectiveBlacklistedProviders(ALL, ['vllm', 'openai'], true)).not.toContain(
      NEXORA_MODEL_PROVIDER
    )
  })

  it('returns each provider once', () => {
    const result = effectiveBlacklistedProviders(ALL, ['openai', 'openai'], true)
    expect(new Set(result).size).toBe(result.length)
  })
})

describe('pickNexoraDefaultModel', () => {
  it('picks the first model served by Nexora API', () => {
    expect(pickNexoraDefaultModel(['vllm/nexora-default', 'vllm/nexora-large'])).toBe(
      'vllm/nexora-default'
    )
  })

  it('returns null while no model is known', () => {
    expect(pickNexoraDefaultModel([])).toBeNull()
  })

  it('ignores ids that are not Nexora API models', () => {
    expect(pickNexoraDefaultModel(['gpt-4o', 'vllm/nexora-default'])).toBe('vllm/nexora-default')
  })
})
