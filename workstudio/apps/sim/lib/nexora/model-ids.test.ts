import { describe, expect, it } from 'vitest'
import { classifyOllamaPullError, listedModelIds } from '@/lib/nexora/model-ids'

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

describe('classifyOllamaPullError', () => {
  it('tells apart the download failures a person can act on', () => {
    expect(classifyOllamaPullError('pull model manifest: file does not exist')).toBe('unknownModel')
    expect(classifyOllamaPullError('model "llama9" not found, try pulling it first')).toBe(
      'unknownModel'
    )
    expect(
      classifyOllamaPullError('write /root/.ollama/models/blobs: no space left on device')
    ).toBe('noSpace')
    expect(classifyOllamaPullError('fetch failed')).toBe('network')
    expect(classifyOllamaPullError('dial tcp: lookup registry.ollama.ai: i/o timeout')).toBe(
      'network'
    )
    expect(classifyOllamaPullError('something unexpected')).toBe('other')
  })
})
