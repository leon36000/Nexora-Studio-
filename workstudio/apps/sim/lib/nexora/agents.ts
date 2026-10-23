import { generateId } from '@sim/utils/id'
import { isRecordLike, toArray, toRecord } from '@sim/utils/object'
import type { StoredTool } from '@/lib/workflows/tool-input/types'

/** The workspace folder agents live in (created on first use). */
export const AGENTS_FOLDER = 'Agents'

/** What the agent form edits. */
export interface AgentConfig {
  name: string
  description: string
  instructions: string
  /** Model id as blocks store it (`vllm/<name>`). */
  model: string
  /** Tools other than knowledge search: Nexora Connect (MCP) tools, other workflows. */
  tools: StoredTool[]
  knowledgeBaseIds: string[]
  /** Keep the conversation across messages of one chat. */
  memory: boolean
  welcomeMessage: string
}

interface AgentBlock {
  id: string
  type: string
  name: string
  position: { x: number; y: number }
  enabled: boolean
  subBlocks: Record<string, { id: string; type: string; value: unknown }>
  outputs: Record<string, unknown>
}

interface AgentEdge {
  id: string
  source: string
  target: string
  sourceHandle: string
  targetHandle: string
}

interface AgentWorkflowState {
  blocks: Record<string, AgentBlock>
  edges: AgentEdge[]
  loops: Record<string, never>
  parallels: Record<string, never>
  /** Not part of the canvas: the agent's name, description and welcome message live here. */
  metadata: { name: string; description: string; welcomeMessage: string }
}

const START_BLOCK_NAME = 'Start'
const AGENT_BLOCK_NAME = 'Agent'
const USER_MESSAGE = '<start.input>'
const CONVERSATION_ID = '<start.conversationId>'
const FORM_MEMORY_TYPES = new Set(['none', 'conversation'])

/** The tool entry the agent block uses to search one knowledge base (as the tool picker builds it). */
function knowledgeTool(knowledgeBaseId: string): StoredTool {
  return {
    type: 'knowledge',
    title: 'Knowledge', // i18n-ignore: persisted tool title, as the tool picker stores it
    toolId: 'knowledge_search',
    operation: 'search',
    params: { knowledgeBaseSelector: knowledgeBaseId },
    isExpanded: false,
    usageControl: 'auto',
  }
}

function isStoredTool(value: unknown): value is StoredTool {
  return isRecordLike(value) && typeof value.type === 'string'
}

/** The knowledge base a knowledge search searches, when the form can show it as one of its bases. */
function knowledgeBaseOf(tool: StoredTool): string | null {
  if (tool.type !== 'knowledge' || tool.toolId !== 'knowledge_search') return null
  const id = tool.params?.knowledgeBaseSelector
  return typeof id === 'string' && id !== '' ? id : null
}

function subBlockValue(block: Record<string, unknown>, id: string): unknown {
  const subBlock = toRecord(block.subBlocks)[id]
  return isRecordLike(subBlock) ? subBlock.value : undefined
}

/** A Start field the editor shows by default has no name: it adds no input to the chat. */
function hasCustomInputs(start: Record<string, unknown>): boolean {
  const fields = subBlockValue(start, 'inputFormat')
  return (
    Array.isArray(fields) &&
    fields.some(
      (field) => isRecordLike(field) && typeof field.name === 'string' && field.name.trim()
    )
  )
}

/** The workflow and its agent block, when the workflow is exactly the agent shape. */
function agentShape(state: unknown): {
  state: Record<string, unknown> & { blocks: Record<string, unknown> }
  agent: Record<string, unknown>
} | null {
  if (!isRecordLike(state) || !isRecordLike(state.blocks) || !Array.isArray(state.edges))
    return null
  const blocks = Object.values(state.blocks).filter(isRecordLike)
  if (Object.keys(state.blocks).length !== 2 || blocks.length !== 2 || state.edges.length !== 1)
    return null
  const start = blocks.find((b) => b.type === 'start_trigger' && b.name === START_BLOCK_NAME)
  const agent = blocks.find((b) => b.type === 'agent' && b.name === AGENT_BLOCK_NAME)
  const edge = state.edges[0]
  if (
    !start ||
    !agent ||
    start.enabled === false ||
    agent.enabled === false ||
    !isRecordLike(edge) ||
    edge.source !== start.id ||
    edge.target !== agent.id ||
    hasCustomInputs(start)
  ) {
    return null
  }
  return { state: { ...state, blocks: state.blocks }, agent }
}

/** The agent block's sub-blocks the form owns, for `config`. */
function formSubBlocks(config: AgentConfig, previousTools: StoredTool[]): AgentBlock['subBlocks'] {
  const previousKnowledge = new Map<string, StoredTool>()
  for (const tool of previousTools) {
    const id = knowledgeBaseOf(tool)
    if (id && !previousKnowledge.has(id)) previousKnowledge.set(id, tool)
  }
  const subBlocks: AgentBlock['subBlocks'] = {
    messages: {
      id: 'messages',
      type: 'messages-input',
      value: [
        { role: 'system', content: config.instructions },
        { role: 'user', content: USER_MESSAGE },
      ],
    },
    model: { id: 'model', type: 'combobox', value: config.model },
    tools: {
      id: 'tools',
      type: 'tool-input',
      value: [
        ...config.tools,
        ...config.knowledgeBaseIds.map((id) => previousKnowledge.get(id) ?? knowledgeTool(id)),
      ],
    },
    memoryType: {
      id: 'memoryType',
      type: 'dropdown',
      value: config.memory ? 'conversation' : 'none',
    },
  }
  if (config.memory) {
    subBlocks.conversationId = { id: 'conversationId', type: 'short-input', value: CONVERSATION_ID }
  }
  return subBlocks
}

/**
 * The workflow an agent is: Start → Agent, in the shape the importer reads. Start is the unified
 * entry point: a deployed chat sends its message as `<start.input>`. Rewriting a `previous` state
 * that is still in the agent shape starts from it and replaces only what the form owns (messages,
 * model, tools, memory): ids, positions and every setting made in the editor (temperature,
 * response format, a knowledge search's own options…) are kept, so a published chat keeps reading
 * the same agent block.
 */
export function buildAgentWorkflow(config: AgentConfig, previous?: unknown): AgentWorkflowState {
  const metadata = {
    name: config.name,
    description: config.description,
    welcomeMessage: config.welcomeMessage,
  }
  const shape = previous === undefined ? null : agentShape(previous)
  if (shape) {
    const blocks = structuredClone(shape.state.blocks) as Record<string, AgentBlock>
    const agentId = String(shape.agent.id)
    const previousTools = toArray(subBlockValue(shape.agent, 'tools')).filter(isStoredTool)
    blocks[agentId] = {
      ...blocks[agentId],
      subBlocks: { ...blocks[agentId].subBlocks, ...formSubBlocks(config, previousTools) },
    }
    return {
      blocks,
      edges: structuredClone(shape.state.edges) as AgentEdge[],
      loops: {},
      parallels: {},
      metadata,
    }
  }

  const startId = generateId()
  const agentId = generateId()
  return {
    blocks: {
      [startId]: {
        id: startId,
        type: 'start_trigger',
        name: START_BLOCK_NAME,
        position: { x: 0, y: 0 },
        enabled: true,
        subBlocks: { inputFormat: { id: 'inputFormat', type: 'input-format', value: [] } },
        outputs: {},
      },
      [agentId]: {
        id: agentId,
        type: 'agent',
        name: AGENT_BLOCK_NAME,
        position: { x: 420, y: 0 },
        enabled: true,
        subBlocks: formSubBlocks(config, []),
        outputs: {},
      },
    },
    edges: [
      {
        id: generateId(),
        source: startId,
        target: agentId,
        sourceHandle: 'source',
        targetHandle: 'target',
      },
    ],
    loops: {},
    parallels: {},
    metadata,
  }
}

/**
 * The agent configuration a workflow holds, or `null` when the form cannot show it faithfully
 * (edited in the editor beyond the agent shape: another block or edge, a disabled block, Start
 * inputs, a sliding-window memory…): the form then never rewrites it.
 */
export function readAgentWorkflow(state: unknown): AgentConfig | null {
  const shape = agentShape(state)
  if (!shape) return null
  const { agent } = shape

  const messages = subBlockValue(agent, 'messages')
  if (!Array.isArray(messages) || messages.length !== 2) return null
  const [system, user] = messages
  if (!isRecordLike(system) || system.role !== 'system' || typeof system.content !== 'string')
    return null
  if (!isRecordLike(user) || user.role !== 'user' || user.content !== USER_MESSAGE) return null

  const model = subBlockValue(agent, 'model')
  const tools = subBlockValue(agent, 'tools') ?? null
  const memoryType = subBlockValue(agent, 'memoryType') ?? 'none'
  if (typeof model !== 'string' || (tools !== null && !Array.isArray(tools))) return null
  if (typeof memoryType !== 'string' || !FORM_MEMORY_TYPES.has(memoryType)) return null
  const memory = memoryType === 'conversation'
  if (memory && subBlockValue(agent, 'conversationId') !== CONVERSATION_ID) return null

  const storedTools = toArray(tools).filter(isStoredTool)
  const metadata = toRecord(shape.state.metadata)
  const text = (value: unknown) => (typeof value === 'string' ? value : '')
  return {
    name: text(metadata.name),
    description: text(metadata.description),
    instructions: system.content,
    model,
    tools: storedTools.filter((tool) => knowledgeBaseOf(tool) === null),
    knowledgeBaseIds: storedTools.map(knowledgeBaseOf).filter((id): id is string => id !== null),
    memory,
    welcomeMessage: text(metadata.welcomeMessage),
  }
}

/**
 * The fields the workflow's state holds. Name and description live on the workflow row and the
 * welcome message on the chat, so comparing two states (or two versions) compares these only.
 */
const STATE_FIELDS = ['instructions', 'model', 'tools', 'knowledgeBaseIds', 'memory'] as const

/** Fields that differ between two versions of an agent, for the version comparison. */
export function diffAgentConfigs(
  before: AgentConfig,
  after: AgentConfig
): { field: keyof AgentConfig; before: string; after: string }[] {
  const fields = Object.keys(before) as (keyof AgentConfig)[]
  const show = (value: AgentConfig[keyof AgentConfig]) =>
    typeof value === 'string' ? value : JSON.stringify(value)
  return fields
    .map((field) => ({ field, before: show(before[field]), after: show(after[field]) }))
    .filter((change) => change.before !== change.after)
}

/** Fields that differ between two published versions (a version holds the workflow state only). */
export function diffAgentVersions(
  before: AgentConfig,
  after: AgentConfig
): ReturnType<typeof diffAgentConfigs> {
  const stateFields = new Set<keyof AgentConfig>(STATE_FIELDS)
  return diffAgentConfigs(before, after).filter((change) => stateFields.has(change.field))
}

/**
 * Whether the stored workflow no longer holds what the form loaded as `baseline`: another tab or
 * the editor changed the agent, or took it out of the agent shape. Saving then would overwrite
 * that change, so the form refuses.
 */
export function agentChangedSince(baseline: AgentConfig, storedState: unknown): boolean {
  const stored = readAgentWorkflow(storedState)
  return stored === null || diffAgentVersions(baseline, stored).length > 0
}

/**
 * Whether the form holds changes to save: the name is saved trimmed, and the welcome message is
 * saved when publishing.
 */
export function hasUnsavedAgentChanges(saved: AgentConfig, draft: AgentConfig): boolean {
  return diffAgentConfigs(saved, { ...draft, name: draft.name.trim() }).some(
    ({ field }) => field !== 'welcomeMessage'
  )
}
