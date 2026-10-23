import { generateId } from '@sim/utils/id'
import { isRecordLike, toRecord } from '@sim/utils/object'
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
  outputs: Record<string, never>
}

interface AgentWorkflowState {
  blocks: Record<string, AgentBlock>
  edges: {
    id: string
    source: string
    target: string
    sourceHandle: string
    targetHandle: string
  }[]
  loops: Record<string, never>
  parallels: Record<string, never>
  /** Not part of the canvas: the agent's name, description and welcome message live here. */
  metadata: { name: string; description: string; welcomeMessage: string }
}

const START_BLOCK_NAME = 'Start'
const AGENT_BLOCK_NAME = 'Agent'
const USER_MESSAGE = '<start.input>'
const CONVERSATION_ID = '<start.conversationId>'

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

function isKnowledgeTool(tool: StoredTool): boolean {
  return tool.type === 'knowledge' && tool.toolId === 'knowledge_search'
}

/** The start, agent and edge ids of a workflow in the agent shape, or `null`. */
function agentShapeIds(
  state: unknown
): { startId: string; agentId: string; edgeId: string } | null {
  if (readAgentWorkflow(state) === null || !isRecordLike(state) || !Array.isArray(state.edges))
    return null
  const edge = toRecord(state.edges[0])
  const { id, source, target } = edge
  if (typeof id !== 'string' || typeof source !== 'string' || typeof target !== 'string')
    return null
  return { startId: source, agentId: target, edgeId: id }
}

/**
 * The workflow an agent is: Start → Agent, in the shape the importer reads. Start is the unified
 * entry point: a deployed chat sends its message as `<start.input>`. Rewriting a `previous` state
 * that is still in the agent shape keeps its block and edge ids, so a published chat keeps reading
 * the same agent block.
 */
export function buildAgentWorkflow(config: AgentConfig, previous?: unknown): AgentWorkflowState {
  const kept = previous === undefined ? null : agentShapeIds(previous)
  const startId = kept?.startId ?? generateId()
  const agentId = kept?.agentId ?? generateId()
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
      value: [...config.tools, ...config.knowledgeBaseIds.map(knowledgeTool)],
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
        subBlocks,
        outputs: {},
      },
    },
    edges: [
      {
        id: kept?.edgeId ?? generateId(),
        source: startId,
        target: agentId,
        sourceHandle: 'source',
        targetHandle: 'target',
      },
    ],
    loops: {},
    parallels: {},
    metadata: {
      name: config.name,
      description: config.description,
      welcomeMessage: config.welcomeMessage,
    },
  }
}

function subBlockValue(block: Record<string, unknown>, id: string): unknown {
  const subBlock = toRecord(block.subBlocks)[id]
  return isRecordLike(subBlock) ? subBlock.value : undefined
}

/**
 * The agent configuration a workflow holds, or `null` when it is not exactly the agent shape
 * (edited in the editor beyond what the form shows): the form then never rewrites it.
 */
export function readAgentWorkflow(state: unknown): AgentConfig | null {
  if (!isRecordLike(state) || !isRecordLike(state.blocks) || !Array.isArray(state.edges))
    return null
  const blocks = Object.values(state.blocks).filter(isRecordLike)
  if (blocks.length !== 2 || state.edges.length !== 1) return null
  const start = blocks.find((b) => b.type === 'start_trigger' && b.name === START_BLOCK_NAME)
  const agent = blocks.find((b) => b.type === 'agent' && b.name === AGENT_BLOCK_NAME)
  const edge = state.edges[0]
  if (
    !start ||
    !agent ||
    !isRecordLike(edge) ||
    edge.source !== start.id ||
    edge.target !== agent.id
  ) {
    return null
  }

  const messages = subBlockValue(agent, 'messages')
  if (!Array.isArray(messages) || messages.length !== 2) return null
  const [system, user] = messages
  if (!isRecordLike(system) || system.role !== 'system' || typeof system.content !== 'string')
    return null
  if (!isRecordLike(user) || user.role !== 'user' || user.content !== USER_MESSAGE) return null

  const model = subBlockValue(agent, 'model')
  const tools = subBlockValue(agent, 'tools')
  const memory = subBlockValue(agent, 'memoryType') === 'conversation'
  if (typeof model !== 'string' || (tools !== undefined && !Array.isArray(tools))) return null
  if (memory && subBlockValue(agent, 'conversationId') !== CONVERSATION_ID) return null

  const storedTools = ((tools ?? []) as unknown[]).filter(isStoredTool)
  const metadata = toRecord(state.metadata)
  const text = (value: unknown) => (typeof value === 'string' ? value : '')
  return {
    name: text(metadata.name),
    description: text(metadata.description),
    instructions: system.content,
    model,
    tools: storedTools.filter((tool) => !isKnowledgeTool(tool)),
    knowledgeBaseIds: storedTools
      .filter(isKnowledgeTool)
      .map((tool) => String(tool.params?.knowledgeBaseSelector ?? ''))
      .filter(Boolean),
    memory,
    welcomeMessage: text(metadata.welcomeMessage),
  }
}

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
