import { describe, expect, it } from 'vitest'
import { OrchestrationError } from '@/lib/core/orchestration/types'
import {
  assertKeyModelsWithinGroup,
  keyModelRefusal,
  keyModelsOutsideGate,
} from '@/lib/nexora/developer-api/model-gate'

/** Nexora API's routers: `nexora-default` is an alias of `cloud-glm-5-3`. */
const ROUTERS: Record<string, string> = {
  'cloud-glm-5-3': 'cloud-glm-5-3',
  'nexora-default': 'cloud-glm-5-3',
  'qwen2.5:7b': 'qwen2.5:7b',
}
const resolve = (name: string) => ROUTERS[name.trim().toLowerCase()] ?? null

const denyGlm = { deniedModels: ['vllm/cloud-glm-5-3'], allowedModelProviders: null }

describe('keyModelsOutsideGate (creating a key)', () => {
  it('lets an unrestricted creator create an all-models key', () => {
    expect(keyModelsOutsideGate(null, null, resolve)).toEqual([])
    expect(
      keyModelsOutsideGate({ deniedModels: [], allowedModelProviders: null }, null, resolve)
    ).toEqual([])
  })

  it('refuses an all-models key to a creator whose access group restricts models', () => {
    expect(keyModelsOutsideGate(denyGlm, null, resolve)).toBe('all')
    expect(
      keyModelsOutsideGate({ deniedModels: [], allowedModelProviders: ['ollama'] }, null, resolve)
    ).toBe('all')
  })

  it('names the listed models the creator may not use, through their aliases', () => {
    expect(keyModelsOutsideGate(denyGlm, ['qwen2.5:7b', 'nexora-default'], resolve)).toEqual([
      'nexora-default',
    ])
  })

  it('accepts a list inside the creator’s models', () => {
    expect(keyModelsOutsideGate(denyGlm, ['qwen2.5:7b'], resolve)).toEqual([])
  })

  it('refuses every Nexora model when the group allows no Nexora provider', () => {
    const config = { deniedModels: [], allowedModelProviders: ['openai'] }
    expect(keyModelsOutsideGate(config, ['qwen2.5:7b'], resolve)).toEqual(['qwen2.5:7b'])
  })
})

describe('keyModelRefusal (each call)', () => {
  it('lets every model through without a restriction', () => {
    expect(keyModelRefusal(null, 'cloud-glm-5-3', resolve)).toBeNull()
  })

  it('refuses a model the access group denies, named directly or by an alias', () => {
    expect(keyModelRefusal(denyGlm, 'cloud-glm-5-3', resolve)?.status).toBe(403)
    expect(keyModelRefusal(denyGlm, 'NEXORA-DEFAULT', resolve)?.code).toBe('model_not_allowed')
  })

  it('lets the other models through', () => {
    expect(keyModelRefusal(denyGlm, 'qwen2.5:7b', resolve)).toBeNull()
  })

  it('judges an unknown name by itself when the model list cannot be read', () => {
    expect(keyModelRefusal(denyGlm, 'cloud-glm-5-3', () => null)?.status).toBe(403)
    expect(keyModelRefusal(denyGlm, 'other', () => null)).toBeNull()
  })
})

describe('assertKeyModelsWithinGroup (the creation refusal)', () => {
  const refusalOf = (allowedModels: string[] | null) => {
    try {
      assertKeyModelsWithinGroup(denyGlm, allowedModels, resolve)
      return null
    } catch (error) {
      return error
    }
  }

  it('refuses an all-models key with a 403 the creator can act on', () => {
    const refusal = refusalOf(null)
    expect(refusal).toBeInstanceOf(OrchestrationError)
    expect(refusal).toMatchObject({ code: 'forbidden' })
    expect((refusal as Error).message).toContain('Tous les modèles')
  })

  it('names the denied models', () => {
    expect((refusalOf(['nexora-default']) as Error).message).toContain('nexora-default')
  })

  it('lets a key within the group through', () => {
    expect(refusalOf(['qwen2.5:7b'])).toBeNull()
  })
})
