/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import { ESSENTIAL_BLOCK_TYPES, splitCoreBlocks, splitIntegrations } from '@/lib/nexora/steps/toolbar-order'

const item = (type: string, name = type) => ({ type, name })

describe('splitCoreBlocks', () => {
  it('met d’abord les essentiels, dans l’ordre d’une automatisation, puis les autres par nom', () => {
    const { essentials, others } = splitCoreBlocks([
      item('response', 'Response'),
      item('zeta', 'Zeta'),
      item('agent', 'Agent'),
      item('alpha', 'Alpha'),
      item('condition', 'Condition'),
    ])
    expect(essentials.map((i) => i.type)).toEqual(['agent', 'condition', 'response'])
    expect(others.map((i) => i.type)).toEqual(['alpha', 'zeta'])
  })

  it('n’invente pas un essentiel absent et ne perd aucun bloc', () => {
    const all = ESSENTIAL_BLOCK_TYPES.slice(0, 3).map((type) => item(type)).concat([item('x', 'X')])
    const { essentials, others } = splitCoreBlocks(all)
    expect(essentials.length + others.length).toBe(all.length)
    expect(new Set([...essentials, ...others].map((i) => i.type)).size).toBe(all.length)
  })

  it('les essentiels ne se répètent pas', () => {
    expect(new Set(ESSENTIAL_BLOCK_TYPES).size).toBe(ESSENTIAL_BLOCK_TYPES.length)
  })
})

describe('splitIntegrations', () => {
  it('sépare Nexora Connect (le bloc MCP) des intégrations directes, triées par nom', () => {
    const { connect, direct } = splitIntegrations([
      item('slack', 'Slack'),
      item('mcp', 'MCP'),
      item('gmail', 'Gmail'),
    ])
    expect(connect.map((i) => i.type)).toEqual(['mcp'])
    expect(direct.map((i) => i.type)).toEqual(['gmail', 'slack'])
  })

  it('ne renvoie aucun bloc Connect quand le bloc MCP est absent', () => {
    expect(splitIntegrations([item('slack')]).connect).toEqual([])
  })
})
