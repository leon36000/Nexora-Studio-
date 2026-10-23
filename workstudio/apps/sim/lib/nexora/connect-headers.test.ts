import { setEnv } from '@sim/testing/mocks/env.mock'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  CONNECT_TOKEN_PENDING,
  connectTokenNeedsRepair,
  guardNexoraConnectHeaders,
  isNexoraConnectUrl,
} from '@/lib/nexora/connect-headers'

const CONNECT = 'http://nexora-connect:3000/mcp'
const STORED = { Authorization: 'Bearer oct_workspace', 'X-Trace': 'on' }

describe('Nexora Connect server headers', () => {
  beforeEach(() => {
    setEnv({ NEXORA_CONNECT_MCP_URL: CONNECT, NEXORA_CONNECT_TOKEN: 'shared-runtime' })
  })

  it('recognises any address on Nexora Connect’s origin, whatever the path or query', () => {
    expect(isNexoraConnectUrl(CONNECT)).toBe(true)
    expect(isNexoraConnectUrl('http://NEXORA-CONNECT:3000/mcp/?x=1')).toBe(true)
    expect(isNexoraConnectUrl('http://nexora-connect:3001/mcp')).toBe(false)
    expect(isNexoraConnectUrl('https://mcp.example.com/mcp')).toBe(false)
    expect(isNexoraConnectUrl(null)).toBe(false)
    expect(isNexoraConnectUrl('not a url')).toBe(false)
  })

  it('keeps the workspace token when the settings form saves the server without its values', () => {
    expect(
      guardNexoraConnectHeaders({
        storedUrl: CONNECT,
        storedHeaders: STORED,
        nextUrl: CONNECT,
        incoming: { 'X-Trace': 'off' },
      })
    ).toEqual({ 'X-Trace': 'off', Authorization: 'Bearer oct_workspace' })
  })

  it('never lets an edit replace the workspace token, whatever the header’s case or value', () => {
    expect(
      guardNexoraConnectHeaders({
        storedUrl: CONNECT,
        storedHeaders: STORED,
        nextUrl: CONNECT,
        incoming: { authorization: 'Bearer shared-runtime', AUTHORIZATION: '••••' },
      })
    ).toEqual({ Authorization: 'Bearer oct_workspace' })
  })

  it('leaves the headers alone when an edit does not send any', () => {
    expect(
      guardNexoraConnectHeaders({
        storedUrl: CONNECT,
        storedHeaders: STORED,
        nextUrl: CONNECT,
        incoming: undefined,
      })
    ).toBeUndefined()
  })

  it('drops the workspace token when the server is pointed away from Nexora Connect', () => {
    expect(
      guardNexoraConnectHeaders({
        storedUrl: CONNECT,
        storedHeaders: STORED,
        nextUrl: 'https://collector.example.com/mcp',
        incoming: undefined,
      })
    ).toEqual({ 'X-Trace': 'on' })
  })

  it('refuses a caller-chosen token on a server pointed at Nexora Connect', () => {
    expect(
      guardNexoraConnectHeaders({
        storedUrl: 'https://mcp.example.com/mcp',
        storedHeaders: { Authorization: 'Bearer other' },
        nextUrl: CONNECT,
        incoming: { Authorization: 'Bearer shared-runtime' },
      })
    ).toEqual({})
    expect(
      guardNexoraConnectHeaders({
        storedUrl: undefined,
        storedHeaders: undefined,
        nextUrl: CONNECT,
        incoming: { Authorization: 'Bearer shared-runtime' },
      })
    ).toEqual({})
  })

  it('does not touch other servers', () => {
    const incoming = { Authorization: 'Bearer mine' }
    expect(
      guardNexoraConnectHeaders({
        storedUrl: 'https://mcp.example.com/mcp',
        storedHeaders: { Authorization: 'Bearer old' },
        nextUrl: 'https://mcp.example.com/mcp',
        incoming,
      })
    ).toEqual(incoming)
  })

  it('asks for a repair when a Connect server holds the shared token, the pending one, or none', () => {
    expect(connectTokenNeedsRepair({ Authorization: 'Bearer shared-runtime' })).toBe(true)
    expect(connectTokenNeedsRepair({ authorization: `Bearer ${CONNECT_TOKEN_PENDING}` })).toBe(true)
    expect(connectTokenNeedsRepair({})).toBe(true)
    expect(connectTokenNeedsRepair(null)).toBe(true)
    expect(connectTokenNeedsRepair({ Authorization: 'Bearer oct_workspace' })).toBe(false)
  })
})
