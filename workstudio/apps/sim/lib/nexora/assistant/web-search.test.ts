import { describe, expect, it } from 'vitest'
import { withWebSearchTool } from '@/lib/nexora/assistant/web-search'

const searchTool = {
  type: 'searxng',
  title: 'Web search',
  toolId: 'searxng_search',
  params: {},
  isExpanded: false,
  usageControl: 'auto',
}
const knowledgeTool = { type: 'knowledge', toolId: 'knowledge_search', params: {} }

function agentBlock(tools: unknown[], data: Record<string, unknown> = {}) {
  return { subBlocks: { tools: { id: 'tools', type: 'tool-input', value: tools } }, data }
}

describe('withWebSearchTool', () => {
  it('adds the search to an Assistant that has none, once, and marks it', () => {
    const upgraded = withWebSearchTool(agentBlock([knowledgeTool]))
    expect(upgraded).not.toBeNull()
    const tools = (upgraded?.subBlocks.tools as { value: unknown[] }).value
    expect(tools).toEqual([knowledgeTool, searchTool])
    expect(upgraded?.data.nexoraAssistantWebSearchRevision).toBe(1)
  })

  it('keeps the other settings of the block', () => {
    const upgraded = withWebSearchTool(agentBlock([], { canonicalModes: { files: 'advanced' } }))
    expect(upgraded?.data.canonicalModes).toEqual({ files: 'advanced' })
  })

  it('leaves an Assistant that has the search alone', () => {
    expect(withWebSearchTool(agentBlock([searchTool]))).toBeNull()
  })

  it('respects an administrator who removed the search after the upgrade', () => {
    expect(withWebSearchTool(agentBlock([], { nexoraAssistantWebSearchRevision: 1 }))).toBeNull()
  })

  it('adds the search to a block without a tools list', () => {
    const upgraded = withWebSearchTool({ subBlocks: {}, data: null })
    expect((upgraded?.subBlocks.tools as { value: unknown[] }).value).toEqual([searchTool])
  })
})
