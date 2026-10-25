import { resetEnvMock, setEnv } from '@sim/testing/mocks/env.mock'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const gate = vi.hoisted(() => ({ enabled: vi.fn() }))
vi.mock('@/lib/nexora/code-execution', () => ({ isCodeExecutionEnabled: gate.enabled }))

import { dropUnavailableBuiltinTools } from '@/lib/nexora/builtin-tools'

const pythonTool = { type: 'function', toolId: 'function_execute', params: { language: 'python' } }
const javascriptTool = {
  type: 'function',
  toolId: 'function_execute',
  params: { language: 'javascript' },
}
const searchTool = { type: 'searxng', toolId: 'searxng_search' }
const knowledgeTool = { type: 'knowledge', toolId: 'knowledge_search' }

describe('dropUnavailableBuiltinTools', () => {
  beforeEach(() => {
    gate.enabled.mockResolvedValue(false)
  })
  afterEach(resetEnvMock)

  it('keeps every tool when nothing is limiting them (no Nexora sandbox, SearXNG set)', async () => {
    setEnv({ SEARXNG_URL: 'http://searxng:8080' })
    const tools = [pythonTool, searchTool, knowledgeTool]
    expect(await dropUnavailableBuiltinTools(tools)).toEqual(tools)
    expect(gate.enabled).not.toHaveBeenCalled()
  })

  it('withdraws the Python tool while code execution is off, but not other Function tools', async () => {
    setEnv({
      NEXORA_CODE_SANDBOX_URL: 'http://code-sandbox:8080',
      NEXORA_CODE_SANDBOX_TOKEN: 'a-token-of-at-least-thirty-two-characters',
      SEARXNG_URL: 'http://searxng:8080',
    })
    expect(await dropUnavailableBuiltinTools([pythonTool, javascriptTool, knowledgeTool])).toEqual([
      javascriptTool,
      knowledgeTool,
    ])
    gate.enabled.mockResolvedValue(true)
    expect(await dropUnavailableBuiltinTools([pythonTool, javascriptTool])).toEqual([
      pythonTool,
      javascriptTool,
    ])
  })

  it('withdraws the web search when the instance has no SearXNG', async () => {
    expect(await dropUnavailableBuiltinTools([searchTool, knowledgeTool])).toEqual([knowledgeTool])
  })
})
