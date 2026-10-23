import { describe, expect, it } from 'vitest'
import {
  MODEL_DEFAULT_BLOCK_TYPES,
  receivesDefaultModel,
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
