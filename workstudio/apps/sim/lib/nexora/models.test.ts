import { describe, expect, it } from 'vitest'
import {
  MODEL_DEFAULT_BLOCK_TYPES,
  nexoraProviderUsage,
  receivesDefaultModel,
  receivesNexoraProvider,
  unavailableModelReplacement,
} from '@/lib/nexora/models'

describe('receivesDefaultModel', () => {
  it('seeds the Nexora model into every block that asks a chat model', () => {
    for (const type of ['agent', 'router', 'router_v2', 'evaluator', 'guardrails']) {
      expect(receivesDefaultModel(type, 'model')).toBe(true)
    }
    expect(MODEL_DEFAULT_BLOCK_TYPES).not.toContain('pi')
  })

  it('leaves other fields and other blocks alone', () => {
    expect(receivesDefaultModel('agent', 'systemPrompt')).toBe(false)
    expect(receivesDefaultModel('pi', 'model')).toBe(false)
    expect(receivesDefaultModel('slack', 'model')).toBe(false)
  })
})

describe('unavailableModelReplacement', () => {
  const usable = ['vllm/nexora-default', 'vllm/mistral-small']

  it('offers the Nexora model when a block keeps a model this instance does not serve', () => {
    expect(unavailableModelReplacement('model', 'claude-sonnet-5-5', usable)).toBe(
      'vllm/nexora-default'
    )
  })

  it('stays silent for a usable model, an empty field, a reference or another field', () => {
    expect(unavailableModelReplacement('model', 'vllm/mistral-small', usable)).toBeNull()
    expect(unavailableModelReplacement('model', '', usable)).toBeNull()
    expect(unavailableModelReplacement('model', '<start.model>', usable)).toBeNull()
    expect(unavailableModelReplacement('operation', 'claude-sonnet-5-5', usable)).toBeNull()
  })

  it('stays silent while the model list is not loaded or has no Nexora model', () => {
    expect(unavailableModelReplacement('model', 'claude-sonnet-5-5', [])).toBeNull()
    expect(unavailableModelReplacement('model', 'claude-sonnet-5-5', ['gpt-4o'])).toBeNull()
  })
})

describe('nexoraProviderUsage', () => {
  it('names the model usage the Nexora provider of each block needs', () => {
    expect(nexoraProviderUsage('vision_v2')).toBe('vision')
    expect(nexoraProviderUsage('mistral_parse_v3')).toBe('vision')
    expect(nexoraProviderUsage('stt')).toBe('transcription')
    expect(nexoraProviderUsage('stt_v2')).toBe('transcription')
  })

  it('has no usage for a block without the Nexora provider', () => {
    expect(nexoraProviderUsage('agent')).toBeNull()
    expect(nexoraProviderUsage('vision')).toBeNull()
  })

  it('starts exactly those blocks on the Nexora provider in the Nexora edition', () => {
    for (const type of ['vision_v2', 'mistral_parse_v3', 'stt', 'stt_v2']) {
      expect(receivesNexoraProvider(type, 'provider', 'vllm/nexora-default')).toBe(true)
    }
    expect(receivesNexoraProvider('agent', 'provider', 'vllm/nexora-default')).toBe(false)
  })
})
