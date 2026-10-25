import { isRecordLike, toArray, toRecord } from '@sim/utils/object'

const WEB_SEARCH_REVISION_KEY = 'nexoraAssistantWebSearchRevision'
const WEB_SEARCH_REVISION = 1

/** The tool as the agent form stores it (see `webSearchTool` in `lib/nexora/agents.ts`). */
const WEB_SEARCH_TOOL = {
  type: 'searxng',
  title: 'Web search', // i18n-ignore: persisted tool title, as the tool picker stores it
  toolId: 'searxng_search',
  params: {},
  isExpanded: false,
  usageControl: 'auto',
} as const

/**
 * A stored Agent block of the general Assistant made to search the web, for an instance whose
 * administrator turned web search on (the search service is installed). `null` when the block has
 * the tool already, or carries the revision mark: an administrator who removed the tool after the
 * upgrade chose so, and it is not put back. Without a search service the tool is withdrawn at run
 * time anyway (see `dropUnavailableBuiltinTools`).
 */
export function withWebSearchTool(block: { subBlocks: unknown; data: unknown }): {
  subBlocks: Record<string, unknown>
  data: Record<string, unknown>
} | null {
  const data = toRecord(block.data)
  const revision = data[WEB_SEARCH_REVISION_KEY]
  if (typeof revision === 'number' && revision >= WEB_SEARCH_REVISION) return null
  const subBlocks = toRecord(block.subBlocks)
  const tools = toArray(toRecord(subBlocks.tools).value)
  if (tools.some((tool) => isRecordLike(tool) && tool.type === 'searxng')) return null
  return {
    subBlocks: {
      ...subBlocks,
      tools: { id: 'tools', type: 'tool-input', value: [...tools, { ...WEB_SEARCH_TOOL }] },
    },
    data: { ...data, [WEB_SEARCH_REVISION_KEY]: WEB_SEARCH_REVISION },
  }
}
