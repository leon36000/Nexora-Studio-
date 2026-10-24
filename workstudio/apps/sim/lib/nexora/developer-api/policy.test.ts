/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import {
  agentRefusal,
  authenticationRefusal,
  capRefusal,
  estimateCallTokens,
  type GatewayKey,
  modelRefusal,
  readBearerKey,
} from '@/lib/nexora/developer-api/policy'

const NOW = new Date('2026-10-23T10:00:00Z')

function key(overrides: Partial<GatewayKey> = {}): GatewayKey {
  return {
    id: 'key-1',
    name: 'n8n',
    scope: 'workspace',
    workspaceId: 'ws-1',
    createdBy: 'user-1',
    allowedModels: null,
    allowAgents: true,
    monthlyTokenCap: null,
    requestsPerMinute: 60,
    expiresAt: null,
    revokedAt: null,
    ...overrides,
  }
}

/** Nexora API's routers: `nexora-default` is an alias of `cloud-glm-5-3`. */
const ROUTERS: Record<string, string> = {
  'nexora-default': 'cloud-glm-5-3',
  'cloud-glm-5-3': 'cloud-glm-5-3',
  'qwen2.5:7b': 'qwen2.5:7b',
  'bge-m3': 'bge-m3',
}
const resolve = (name: string) => ROUTERS[name] ?? null

describe('readBearerKey', () => {
  it('reads a Nexora key from a Bearer header, whatever the scheme case', () => {
    expect(readBearerKey('Bearer sk-nexora-abc')).toBe('sk-nexora-abc')
    expect(readBearerKey('bearer   sk-nexora-abc  ')).toBe('sk-nexora-abc')
  })

  it('refuses a missing header, another scheme or another kind of key', () => {
    expect(readBearerKey(null)).toBeNull()
    expect(readBearerKey('')).toBeNull()
    expect(readBearerKey('Basic c2stbmV4b3Jh')).toBeNull()
    expect(readBearerKey('Bearer sk-sim-abc')).toBeNull()
    expect(readBearerKey('Bearer ')).toBeNull()
  })
})

describe('authenticationRefusal', () => {
  it('lets an active key through', () => {
    expect(authenticationRefusal(key(), NOW)).toBeNull()
    expect(authenticationRefusal(key({ expiresAt: new Date('2026-11-01') }), NOW)).toBeNull()
  })

  it('refuses an unknown key with 401 invalid_api_key, in French', () => {
    const refusal = authenticationRefusal(null, NOW)
    expect(refusal).toMatchObject({ status: 401, code: 'invalid_api_key' })
    expect(refusal?.message).toContain('Clé d’API invalide')
  })

  it('refuses an expired key with 401 expired_api_key and the French date', () => {
    const refusal = authenticationRefusal(key({ expiresAt: new Date('2026-10-01T08:00:00Z') }), NOW)
    expect(refusal).toMatchObject({ status: 401, code: 'expired_api_key' })
    expect(refusal?.message).toContain('expirée')
    expect(refusal?.message).toContain('1 octobre 2026')
  })

  it('refuses a revoked key with 401 revoked_api_key, even before its expiry', () => {
    const refusal = authenticationRefusal(
      key({ revokedAt: new Date('2026-10-20'), expiresAt: new Date('2027-01-01') }),
      NOW
    )
    expect(refusal).toMatchObject({ status: 401, code: 'revoked_api_key' })
    expect(refusal?.message).toContain('révoquée')
  })

  it('treats a key expiring exactly now as expired', () => {
    expect(authenticationRefusal(key({ expiresAt: NOW }), NOW)?.code).toBe('expired_api_key')
  })
})

describe('modelRefusal', () => {
  it('allows every model when the key lists none', () => {
    expect(modelRefusal(key(), 'qwen2.5:7b', resolve)).toBeNull()
    expect(modelRefusal(key(), 'unknown-model', resolve)).toBeNull()
  })

  it('refuses a model outside the list with 403 model_not_allowed, naming the allowed ones', () => {
    const refusal = modelRefusal(key({ allowedModels: ['nexora-default'] }), 'qwen2.5:7b', resolve)
    expect(refusal).toMatchObject({ status: 403, code: 'model_not_allowed' })
    expect(refusal?.message).toContain('qwen2.5:7b')
    expect(refusal?.message).toContain('nexora-default')
  })

  it('compares routers, not spellings: an alias allows its router and the router its alias', () => {
    expect(
      modelRefusal(key({ allowedModels: ['nexora-default'] }), 'cloud-glm-5-3', resolve)
    ).toBeNull()
    expect(
      modelRefusal(key({ allowedModels: ['cloud-glm-5-3'] }), 'nexora-default', resolve)
    ).toBeNull()
  })

  it('is not fooled by case or surrounding spaces', () => {
    const restricted = key({ allowedModels: ['nexora-default'] })
    expect(modelRefusal(restricted, ' NEXORA-DEFAULT ', resolve)).toBeNull()
    expect(modelRefusal(restricted, ' QWEN2.5:7B ', resolve)?.code).toBe('model_not_allowed')
  })

  it('refuses an unknown model on a restricted key rather than guessing', () => {
    expect(modelRefusal(key({ allowedModels: ['nexora-default'] }), 'gpt-4o', resolve)?.code).toBe(
      'model_not_allowed'
    )
  })

  it('falls back to exact names when the model list cannot be read', () => {
    const restricted = key({ allowedModels: ['nexora-default'] })
    expect(modelRefusal(restricted, 'nexora-default', () => null)).toBeNull()
    expect(modelRefusal(restricted, 'cloud-glm-5-3', () => null)?.code).toBe('model_not_allowed')
  })
})

describe('agentRefusal', () => {
  it('lets a workspace key call its agents', () => {
    expect(agentRefusal(key())).toBeNull()
  })

  it('refuses an instance key: an agent belongs to a workspace', () => {
    const refusal = agentRefusal(key({ scope: 'instance', workspaceId: null }))
    expect(refusal).toMatchObject({ status: 403, code: 'agent_needs_workspace_key' })
  })

  it('refuses a workspace key whose agents were turned off', () => {
    expect(agentRefusal(key({ allowAgents: false }))).toMatchObject({
      status: 403,
      code: 'model_not_allowed',
    })
  })
})

describe('capRefusal', () => {
  it('lets a key without a cap through, whatever it used', () => {
    expect(capRefusal(key(), 10_000_000)).toBeNull()
  })

  it('lets a key under its cap through', () => {
    expect(capRefusal(key({ monthlyTokenCap: 1000 }), 999)).toBeNull()
  })

  it('refuses a key that reached its monthly cap with 429 monthly_cap_reached', () => {
    const refusal = capRefusal(key({ monthlyTokenCap: 1000 }), 1000)
    expect(refusal).toMatchObject({
      status: 429,
      code: 'monthly_cap_reached',
      type: 'insufficient_quota',
    })
    expect(refusal?.message).toContain('Plafond mensuel')
  })
})

describe("estimateCallTokens (what a call reserves of its key's month)", () => {
  it('counts the prompt at four characters a token plus a default answer', () => {
    expect(estimateCallTokens(400, undefined)).toEqual({
      promptTokens: 100,
      completionTokens: 1024,
    })
  })

  it('reserves the answer the caller asked for', () => {
    expect(estimateCallTokens(4, 50)).toEqual({ promptTokens: 1, completionTokens: 50 })
  })

  it('bounds a huge max_tokens so one call cannot reserve the whole month', () => {
    expect(estimateCallTokens(0, 1_000_000).completionTokens).toBe(8192)
  })

  it('falls back to the default answer for a max_tokens that is not a positive number', () => {
    for (const value of [0, -5, Number.NaN, '100', null]) {
      expect(estimateCallTokens(0, value).completionTokens).toBe(1024)
    }
  })

  it('reserves no answer for a call that only reads (embeddings)', () => {
    expect(estimateCallTokens(40, 0, { answers: false })).toEqual({
      promptTokens: 10,
      completionTokens: 0,
    })
  })
})
