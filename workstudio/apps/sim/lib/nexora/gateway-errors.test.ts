import { describe, expect, it } from 'vitest'
import {
  classifyGatewayRefusal,
  describeGatewayFailure,
  gatewayFailureOf,
  gatewayRefusalMessage,
} from '@/lib/nexora/gateway-errors'
import { nexoraSiteLinks } from '@/lib/nexora/site-links'

const LINKS = nexoraSiteLinks('https://nexora.example', 'fr')

describe('classifyGatewayRefusal', () => {
  it('knows an empty wallet, a blocked account and a key spending cap (402)', () => {
    expect(classifyGatewayRefusal({ status: 402, code: 'insufficient_quota' })).toBe(
      'insufficient-funds'
    )
    expect(classifyGatewayRefusal({ status: 402, code: 'account_blocked' })).toBe('account-blocked')
    expect(classifyGatewayRefusal({ status: 402, code: 'api_key_spend_cap_reached' })).toBe(
      'key-cap'
    )
    expect(classifyGatewayRefusal({ status: 402 })).toBe('insufficient-funds')
  })

  it('knows a revoked, expired or unknown key (401)', () => {
    expect(classifyGatewayRefusal({ status: 401, code: 'api_key_revoked' })).toBe('key-rejected')
    expect(classifyGatewayRefusal({ status: 401, code: 'api_key_expired' })).toBe('key-rejected')
    expect(classifyGatewayRefusal({ status: 401 })).toBe('key-rejected')
  })

  it('knows a model the account cannot use, a rate limit and a gateway that is down', () => {
    expect(classifyGatewayRefusal({ status: 404, code: 'model_not_found' })).toBe('model-not-found')
    expect(classifyGatewayRefusal({ status: 429, code: 'rate_limit_exceeded' })).toBe(
      'rate-limited'
    )
    expect(classifyGatewayRefusal({ status: 503, code: 'gateway_unavailable' })).toBe('unavailable')
    expect(classifyGatewayRefusal({ status: 502 })).toBe('unavailable')
    expect(classifyGatewayRefusal({ status: 504 })).toBe('unavailable')
  })

  it('leaves the gateway’s own explanation alone for a privacy refusal or a bad request', () => {
    expect(classifyGatewayRefusal({ status: 403, code: 'privacy_policy_denied' })).toBeNull()
    expect(classifyGatewayRefusal({ status: 400, code: 'invalid_request' })).toBeNull()
    expect(classifyGatewayRefusal({ status: undefined })).toBeNull()
  })
})

describe('gatewayRefusalMessage', () => {
  it('sends an empty wallet to the site’s wallet page', () => {
    const message = gatewayRefusalMessage('insufficient-funds', LINKS)
    expect(message).toContain('solde')
    expect(message).toContain('https://nexora.example/compte/facturation')
  })

  it('sends a blocked account to the wallet page too', () => {
    expect(gatewayRefusalMessage('account-blocked', LINKS)).toContain(
      'https://nexora.example/compte/facturation'
    )
  })

  it('tells how to get a new key after a revoked one: sign in again', () => {
    const message = gatewayRefusalMessage('key-rejected', LINKS)
    expect(message).toMatch(/reconnect/i)
    expect(message).not.toContain('nxk_')
  })

  it('still says what to do without a site address', () => {
    const message = gatewayRefusalMessage('insufficient-funds', null)
    expect(message).toContain('portefeuille')
    expect(message).not.toContain('http')
  })

  it('words every refusal in French', () => {
    for (const refusal of [
      'insufficient-funds',
      'account-blocked',
      'key-cap',
      'key-rejected',
      'rate-limited',
      'model-not-found',
      'unavailable',
    ] as const) {
      expect(gatewayRefusalMessage(refusal, LINKS)).toMatch(/[a-zé]/)
      expect(gatewayRefusalMessage(refusal, LINKS)).not.toMatch(
        /\b(insufficient|revoked|unavailable)\b/i
      )
    }
  })
})

describe('describeGatewayFailure', () => {
  it('is null for what the gateway explains itself', () => {
    expect(describeGatewayFailure({ status: 403, code: 'privacy_policy_denied' }, LINKS)).toBeNull()
  })

  it('words a refusal and names its kind', () => {
    expect(describeGatewayFailure({ status: 402, code: 'insufficient_quota' }, LINKS)).toEqual({
      refusal: 'insufficient-funds',
      message: gatewayRefusalMessage('insufficient-funds', LINKS),
    })
  })
})

describe('gatewayFailureOf', () => {
  it('reads the status and code of an OpenAI client error', () => {
    expect(
      gatewayFailureOf({ status: 402, error: { code: 'insufficient_quota', message: 'x' } })
    ).toEqual({ status: 402, code: 'insufficient_quota' })
  })

  it('tolerates an error that carries neither', () => {
    expect(gatewayFailureOf(new Error('socket hang up'))).toEqual({ status: undefined, code: null })
    expect(gatewayFailureOf({ status: '402', error: 'plain text' })).toEqual({
      status: undefined,
      code: null,
    })
    expect(gatewayFailureOf(null)).toEqual({ status: undefined, code: null })
  })
})
