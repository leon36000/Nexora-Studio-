import { describe, expect, it } from 'vitest'
import { isDefaultModelValue, plainModelName } from '@/lib/nexora/model-label'

describe('model labels on the canvas', () => {
  it('recognises the default model alias, with or without the provider prefix', () => {
    expect(isDefaultModelValue('vllm/nexora-default')).toBe(true)
    expect(isDefaultModelValue('nexora-default')).toBe(true)
    expect(isDefaultModelValue('vllm/cloud-glm-5-3')).toBe(false)
  })

  it('drops the technical provider prefix of a named model', () => {
    expect(plainModelName('vllm/cloud-glm-5-3')).toBe('cloud-glm-5-3')
    expect(plainModelName('gpt-4o')).toBe('gpt-4o')
    expect(plainModelName('')).toBe('')
  })
})
