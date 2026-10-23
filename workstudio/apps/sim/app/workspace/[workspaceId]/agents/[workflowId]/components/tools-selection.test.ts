import { describe, expect, it } from 'vitest'
import type { StoredTool } from '@/lib/workflows/tool-input/types'
import { applyPickedTools } from '@/app/workspace/[workspaceId]/agents/[workflowId]/components/tools-selection'

function mcp(toolName: string): StoredTool {
  return { type: 'mcp', title: toolName, params: { serverId: 'srv-1', toolName } }
}

const custom: StoredTool = { type: 'custom-tool', title: 'Ajouté dans l’éditeur' }
const build = (key: string) => mcp(key.split(':')[2] ?? '')

describe('applyPickedTools', () => {
  it('adds a tool picked twice in one change only once', () => {
    expect(applyPickedTools([], ['mcp:srv-1:send', 'mcp:srv-1:send'], build)).toEqual([mcp('send')])
  })

  it('never adds a second copy of a tool already selected', () => {
    expect(applyPickedTools([mcp('send')], ['mcp:srv-1:send', 'mcp:srv-1:send'], build)).toEqual([
      mcp('send'),
    ])
  })

  it('drops an unpicked tool and keeps the tools the picker does not offer', () => {
    expect(applyPickedTools([custom, mcp('send')], ['mcp:srv-1:list'], build)).toEqual([
      custom,
      mcp('list'),
    ])
  })
})
