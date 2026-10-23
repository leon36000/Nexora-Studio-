import type { StoredTool } from '@/lib/workflows/tool-input/types'

/** A tool's picker value; tools the picker does not offer (added in the editor) get none. */
export function pickerKey(tool: StoredTool): string | null {
  if (tool.type === 'mcp' && tool.params?.serverId && tool.params.toolName) {
    return `mcp:${tool.params.serverId}:${tool.params.toolName}`
  }
  if (tool.type === 'workflow_input' && tool.params?.workflowId) {
    return `workflow:${tool.params.workflowId}`
  }
  return null
}

/**
 * The tools after the picker's selection became `keys`: unpicked tools are dropped, tools the
 * picker does not offer are kept, and each newly picked key adds one tool (`build`), once.
 */
export function applyPickedTools(
  value: StoredTool[],
  keys: string[],
  build: (key: string) => StoredTool | null
): StoredTool[] {
  const picked = new Set(keys)
  const present = new Set<string>()
  const kept = value.filter((tool) => {
    const key = pickerKey(tool)
    if (key === null) return true
    if (!picked.has(key)) return false
    present.add(key)
    return true
  })
  const added: StoredTool[] = []
  for (const key of picked) {
    if (present.has(key)) continue
    const tool = build(key)
    if (tool) added.push(tool)
  }
  return [...kept, ...added]
}
