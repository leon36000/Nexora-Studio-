import { describe, expect, it } from 'vitest'
import { listedModelIds } from '@/lib/nexora/model-ids'

describe('listedModelIds', () => {
  it('lists every Nexora API alias as a model, the default alias first', () => {
    expect(
      listedModelIds([
        { id: 'mistral-small-latest' },
        { id: 'qwen2.5:7b', aliases: ['nexora-default'] },
      ])
    ).toEqual(['vllm/nexora-default', 'vllm/mistral-small-latest', 'vllm/qwen2.5:7b'])
  })

  it('keeps a model listed once when an alias repeats a name, and ignores malformed aliases', () => {
    expect(
      listedModelIds([
        { id: 'qwen2.5:7b', aliases: ['qwen2.5:7b', 42, ''] },
        { id: 'llama3.1:8b', aliases: 'nexora-default' },
      ])
    ).toEqual(['vllm/qwen2.5:7b', 'vllm/llama3.1:8b'])
  })
})
