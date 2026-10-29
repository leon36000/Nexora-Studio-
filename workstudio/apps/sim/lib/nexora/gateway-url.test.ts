import { describe, expect, it } from 'vitest'
import { gatewayModelName, isNexoraGatewayEndpoint } from '@/lib/nexora/gateway-url'

const GATEWAY = 'https://nexora.example/v1'

describe('isNexoraGatewayEndpoint', () => {
  it('recognizes the configured address, with or without a trailing slash', () => {
    expect(isNexoraGatewayEndpoint('https://nexora.example/v1', GATEWAY)).toBe(true)
    expect(isNexoraGatewayEndpoint('https://nexora.example/v1/', GATEWAY)).toBe(true)
  })

  it('refuses any other host, scheme, path, credentials or port, and a gateway that is off', () => {
    expect(isNexoraGatewayEndpoint('https://nexora.example.evil.test/v1', GATEWAY)).toBe(false)
    expect(isNexoraGatewayEndpoint('http://nexora.example/v1', GATEWAY)).toBe(false)
    expect(isNexoraGatewayEndpoint('https://nexora.example/v2', GATEWAY)).toBe(false)
    expect(isNexoraGatewayEndpoint('https://user:pw@nexora.example/v1', GATEWAY)).toBe(false)
    expect(isNexoraGatewayEndpoint('https://nexora.example:8443/v1', GATEWAY)).toBe(false)
    expect(isNexoraGatewayEndpoint('not a url', GATEWAY)).toBe(false)
    expect(isNexoraGatewayEndpoint('https://nexora.example/v1', null)).toBe(false)
  })
})

describe('gatewayModelName', () => {
  it('replaces the default alias, with or without the provider prefix', () => {
    expect(gatewayModelName('vllm/nexora-default', 'nexora/m')).toBe('vllm/nexora/m')
    expect(gatewayModelName('nexora-default', 'nexora/m')).toBe('nexora/m')
    expect(gatewayModelName('vllm/NEXORA-DEFAULT', 'nexora/m')).toBe('vllm/nexora/m')
  })

  it('keeps any other model', () => {
    expect(gatewayModelName('vllm/nexora/other', 'nexora/m')).toBe('vllm/nexora/other')
    expect(gatewayModelName('qwen2.5:7b', 'nexora/m')).toBe('qwen2.5:7b')
  })
})
