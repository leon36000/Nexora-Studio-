import { describe, expect, it } from 'vitest'
import {
  modelRows,
  sameModelList,
  setModelAllowed,
} from '@/ee/access-control/components/denied-models'

describe('setModelAllowed', () => {
  it('denies a model by its WorkStudio id, once', () => {
    expect(setModelAllowed([], 'vllm/cloud-glm-5-3', false)).toEqual(['vllm/cloud-glm-5-3'])
    expect(setModelAllowed(['vllm/cloud-glm-5-3'], 'vllm/cloud-glm-5-3', false)).toEqual([
      'vllm/cloud-glm-5-3',
    ])
  })

  it('allows it again, whatever the case it was stored in', () => {
    expect(
      setModelAllowed(['VLLM/Cloud-GLM-5-3', 'vllm/qwen2.5:7b'], 'vllm/cloud-glm-5-3', true)
    ).toEqual(['vllm/qwen2.5:7b'])
  })
})

describe('sameModelList', () => {
  it('ignores order and case', () => {
    expect(sameModelList(['b', 'A'], ['a', 'B'])).toBe(true)
    expect(sameModelList(['a'], ['a', 'b'])).toBe(false)
  })
})

describe('modelRows', () => {
  const models = [
    { name: 'cloud-glm-5-3', usage: 'chat', isDefault: true, card: { location: 'external' } },
    { name: 'qwen2.5:7b', usage: 'chat', isDefault: false, card: { location: 'local' } },
    {
      name: 'whisper-small',
      usage: 'transcription',
      isDefault: false,
      card: { location: 'local' },
    },
  ] as const

  it('lists the chat models a block can choose, with where each one runs', () => {
    expect(modelRows(models, [])).toEqual([
      {
        id: 'vllm/cloud-glm-5-3',
        name: 'cloud-glm-5-3',
        location: 'external',
        isDefault: true,
        allowed: true,
      },
      {
        id: 'vllm/qwen2.5:7b',
        name: 'qwen2.5:7b',
        location: 'local',
        isDefault: false,
        allowed: true,
      },
    ])
  })

  it('marks a denied model, and keeps a denied model that no longer exists so it can be allowed again', () => {
    const rows = modelRows(models, ['vllm/cloud-glm-5-3', 'vllm/ancien-modele'])
    expect(rows.find((row) => row.name === 'cloud-glm-5-3')?.allowed).toBe(false)
    expect(rows.find((row) => row.id === 'vllm/ancien-modele')).toEqual({
      id: 'vllm/ancien-modele',
      name: 'ancien-modele',
      location: null,
      isDefault: false,
      allowed: false,
    })
  })
})
